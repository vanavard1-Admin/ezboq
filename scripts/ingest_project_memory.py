#!/usr/bin/env python3
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import urllib.parse
import mimetypes
from pathlib import Path
from typing import Dict, List, Optional, Tuple


DEFAULT_ROOT = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get("PROJECT_MEMORY_REPO_ROOT") or DEFAULT_ROOT).resolve()
EXPORTS_DIR = Path(os.environ.get("PROJECT_MEMORY_OUTPUT_DIR") or (ROOT / "scripts" / "outputs")).resolve()
GEMMA_EXPORTS = Path(
    os.environ.get("GEMMA_EXPORTS_DIR") or (ROOT / "bots" / "gemma-discord" / "exports")
).resolve()

DEFAULT_NAMESPACE = "ezboq-construction"
DEFAULT_PAPERCLIP_COMPANY_ID = "9da883fd-a6cc-4593-8b76-a39443c91dae"


def ensure_output_dir() -> None:
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


def load_json(path: Path) -> Optional[object]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def parse_gcs_uri(uri: str) -> Optional[Tuple[str, str]]:
    if not uri.startswith("gs://"):
        return None
    stripped = uri.replace("gs://", "", 1)
    if "/" not in stripped:
        return None
    bucket, object_name = stripped.split("/", 1)
    if not bucket or not object_name:
        return None
    return bucket, object_name


def read_refresh_token() -> Optional[str]:
    direct = os.environ.get("GOOGLE_OAUTH_REFRESH_TOKEN")
    if direct:
        return direct.strip()

    token_path = os.environ.get("GOOGLE_OAUTH_REFRESH_TOKEN_FILE")
    if not token_path:
        return None

    data = load_json(Path(token_path))
    if isinstance(data, dict):
        refresh_token = data.get("refresh_token")
        if isinstance(refresh_token, str) and refresh_token.strip():
            return refresh_token.strip()
        nested_tokens = data.get("tokens")
        if isinstance(nested_tokens, dict):
            refresh_token = nested_tokens.get("refresh_token")
            if isinstance(refresh_token, str) and refresh_token.strip():
                return refresh_token.strip()
    return None


def fetch_google_access_token() -> Optional[str]:
    client_id = (os.environ.get("GOOGLE_OAUTH_CLIENT_ID") or "").strip()
    client_secret = (os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET") or "").strip()
    refresh_token = read_refresh_token()
    if not client_id or not client_secret or not refresh_token:
        return None

    payload = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)

    access_token = data.get("access_token")
    if isinstance(access_token, str) and access_token:
        impersonated = fetch_impersonated_service_account_token(access_token)
        return impersonated or access_token
    return None


def fetch_impersonated_service_account_token(source_access_token: str) -> Optional[str]:
    service_account = (os.environ.get("GOOGLE_IMPERSONATE_SERVICE_ACCOUNT") or "").strip()
    if not service_account:
        return None

    scope = (os.environ.get("GOOGLE_IMPERSONATE_SCOPE") or "https://www.googleapis.com/auth/devstorage.full_control").strip()
    url = (
        "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/"
        f"{urllib.parse.quote(service_account, safe='')}:generateAccessToken"
    )
    body = json.dumps({
        "scope": [scope],
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {source_access_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    token = data.get("accessToken")
    if isinstance(token, str) and token:
        return token
    return None


def upload_file_via_gcs_json_api(local_path: Path, gcs_uri: str, access_token: str) -> None:
    parsed = parse_gcs_uri(gcs_uri)
    if not parsed:
        raise ValueError(f"Invalid GCS URI: {gcs_uri}")

    bucket, object_name = parsed
    upload_url = (
        f"https://storage.googleapis.com/upload/storage/v1/b/"
        f"{urllib.parse.quote(bucket, safe='')}/o?uploadType=media&name="
        f"{urllib.parse.quote(object_name, safe='')}"
    )
    body = local_path.read_bytes()
    content_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    req = urllib.request.Request(
        upload_url,
        data=body,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": content_type,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        resp.read()


def split_keywords(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    tokens = re.split(r"[,\n/|]+", raw)
    return [t.strip().lower() for t in tokens if t.strip()]


def env_flag(name: str) -> bool:
    value = (os.environ.get(name) or "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def entry_fingerprint(entry: Dict[str, object]) -> str:
    metadata = entry.get("metadata") if isinstance(entry, dict) else None
    identifier = ""
    if isinstance(metadata, dict):
        identifier = str(
            metadata.get("identifier")
            or metadata.get("path")
            or metadata.get("original_id")
            or metadata.get("issueId")
            or ""
        ).strip()

    return "||".join([
        str(entry.get("collection") or "").strip(),
        str(entry.get("source") or "").strip(),
        str(entry.get("title") or "").strip(),
        identifier,
    ])


def clamp_priority(value: Optional[object]) -> int:
    try:
        num = int(value)
    except Exception:
        return 5
    return max(1, min(num, 10))


def build_knowledge_entries() -> List[Dict[str, object]]:
    knowledge_path = GEMMA_EXPORTS / "knowledge_base.json"
    data = load_json(knowledge_path)
    if not isinstance(data, list):
        return []

    entries: List[Dict[str, object]] = []
    for row in data:
        if not isinstance(row, dict):
            continue
        title = str(row.get("title") or "").strip()
        content = str(row.get("content") or "").strip()
        if not title or not content:
            continue
        entries.append({
            "collection": "project_memory",
            "namespace": DEFAULT_NAMESPACE,
            "title": title,
            "content": content[:6000],
            "category": str(row.get("category") or "pricing").strip().lower(),
            "tags": split_keywords(row.get("keywords") or ""),
            "priority": clamp_priority(row.get("priority")),
            "active": True,
            "source": "gemma-exports",
            "metadata": {
                "original_id": row.get("id"),
            },
        })

    return entries


def read_file_header(path: Path) -> Tuple[str, List[str]]:
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return "", []

    lines = text.splitlines()
    header_lines: List[str] = []
    exports: List[str] = []

    # Grab top comment block
    for i, line in enumerate(lines[:40]):
        stripped = line.strip()
        if stripped.startswith("/**") or stripped.startswith("/*"):
            header_lines.append(stripped)
            for inner in lines[i + 1 : i + 12]:
                header_lines.append(inner.strip())
                if "*/" in inner:
                    break
            break
        if stripped and not stripped.startswith("//"):
            # fallback to first non-empty line
            header_lines.append(stripped)
            break

    # Extract exports
    export_patterns = [
        r"export\s+(?:const|function|class|type|interface)\s+([A-Za-z0-9_]+)",
        r"export\s+\{\s*([A-Za-z0-9_,\s]+)\s*\}",
    ]
    for pattern in export_patterns:
        for match in re.finditer(pattern, text):
            value = match.group(1)
            if "," in value:
                exports.extend([v.strip() for v in value.split(",") if v.strip()])
            else:
                exports.append(value.strip())

    exports = sorted(set([e for e in exports if e]))
    header = " ".join(header_lines).strip()
    return header, exports


def build_code_index_entries() -> List[Dict[str, object]]:
    entries: List[Dict[str, object]] = []
    targets = [
        (ROOT / "functions" / "src", {".ts", ".tsx", ".js", ".jsx"}),
        (ROOT / "apps" / "web" / "src", {".ts", ".tsx", ".js", ".jsx"}),
        (ROOT / "shared", {".ts", ".tsx", ".js", ".jsx"}),
        (ROOT / "api", {".ts", ".tsx", ".js", ".jsx"}),
        (ROOT / "bots", {".mjs", ".js", ".ts"}),
        (ROOT / "docs", {".md"}),
    ]
    max_entries = 320

    for base, extensions in targets:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if len(entries) >= max_entries:
                break
            if not path.is_file() or path.suffix not in extensions:
                continue

            rel_path = path.relative_to(ROOT).as_posix()
            header, exports = read_file_header(path)
            content_parts = [f"Path: {rel_path}"]
            if header:
                content_parts.append(f"Summary: {header}")
            if exports:
                content_parts.append(f"Exports: {', '.join(exports[:10])}")
            content = "\n".join(content_parts)
            tags = [seg.lower() for seg in rel_path.split("/") if seg and seg.lower() not in {"src"}]

            entries.append({
                "collection": "code_index",
                "namespace": DEFAULT_NAMESPACE,
                "title": f"code: {rel_path}",
                "content": content[:3000],
                "category": "codebase",
                "tags": tags[:12],
                "priority": 4,
                "active": True,
                "source": "repo-index",
                "metadata": {
                    "path": rel_path,
                },
            })

    return entries


def build_test_observation_entries() -> List[Dict[str, object]]:
    entries: List[Dict[str, object]] = []
    tests_dir = ROOT / "tests"
    if not tests_dir.exists():
        return entries

    for path in tests_dir.rglob("*.ts"):
        rel_path = path.relative_to(ROOT).as_posix()
        entries.append({
            "collection": "test_observations",
            "namespace": DEFAULT_NAMESPACE,
            "title": f"Test spec: {rel_path}",
            "content": f"E2E/test spec file located at {rel_path}. Use for regression review and QA recall.",
            "category": "test",
            "tags": ["test", "e2e"] + rel_path.split("/")[-2:],
            "priority": 3,
            "active": True,
            "source": "repo-tests",
            "metadata": {
                "path": rel_path,
            },
        })

    return entries


def is_incident_issue(title: str, description: str) -> bool:
    text = f"{title}\n{description}".lower()
    keywords = [
        "incident",
        "postmortem",
        "outage",
        "downtime",
        "regression",
        "error",
        "failure",
        "bug",
        "rollback",
    ]
    return any(keyword in text for keyword in keywords)


def build_incident_entries_from_repo_docs() -> List[Dict[str, object]]:
    entries: List[Dict[str, object]] = []
    docs_dir = ROOT / "docs"
    if not docs_dir.exists():
        return entries

    for path in docs_dir.rglob("*.md"):
        name = path.name.lower()
        if "incident" not in name and "postmortem" not in name:
            continue
        rel_path = path.relative_to(ROOT).as_posix()
        try:
            content = path.read_text(encoding="utf-8")[:2000]
        except Exception:
            content = f"Incident documentation at {rel_path}."

        entries.append({
            "collection": "incidents",
            "namespace": DEFAULT_NAMESPACE,
            "title": f"Incident doc: {rel_path}",
            "content": content,
            "category": "incident",
            "tags": ["incident", "postmortem"],
            "priority": 6,
            "active": True,
            "source": "repo-docs",
            "metadata": {
                "path": rel_path,
            },
        })

    return entries


def build_incident_entries_from_paperclip() -> List[Dict[str, object]]:
    company_id = os.environ.get("PAPERCLIP_COMPANY_ID") or DEFAULT_PAPERCLIP_COMPANY_ID
    base_url = os.environ.get("PAPERCLIP_API_URL") or "http://127.0.0.1:3100"
    api_key = (os.environ.get("PAPERCLIP_API_KEY") or "").strip()
    include_all_issues = env_flag("PROJECT_MEMORY_PAPERCLIP_INCLUDE_ALL_ISSUES")
    statuses = "todo,in_progress,blocked,backlog,done,in_review,cancelled"
    url = f"{base_url}/api/companies/{company_id}/issues?status={statuses}"

    entries: List[Dict[str, object]] = []
    try:
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            headers["X-API-Key"] = api_key
        request = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(request) as resp:
            issues = json.load(resp)
    except Exception:
        return entries

    for issue in issues if isinstance(issues, list) else []:
        title = str(issue.get("title") or "").strip()
        description = str(issue.get("description") or "").strip()
        if not title:
            continue
        issue_matches_incident = is_incident_issue(title, description)
        if not include_all_issues and not issue_matches_incident:
            continue
        identifier = issue.get("identifier") or issue.get("id")
        status = str(issue.get("status") or "").strip()
        content_parts = [
            f"Issue: {identifier}",
            f"Status: {status}",
        ]
        if description:
            content_parts.append(description[:1200])
        content = "\n".join(content_parts)
        title_prefix = "Incident issue" if issue_matches_incident else "Project issue"
        tags = ["paperclip", "live-board"]
        if issue_matches_incident:
            tags.insert(0, "incident")
        else:
            tags.insert(0, "issue")
        entries.append({
            "collection": "incidents" if issue_matches_incident else "project_issues",
            "namespace": DEFAULT_NAMESPACE,
            "title": f"{title_prefix}: {title}",
            "content": content,
            "category": "incident" if issue_matches_incident else "project_issue",
            "tags": tags,
            "priority": 7,
            "active": True,
            "source": "paperclip-issues",
            "metadata": {
                "issueId": issue.get("id"),
                "identifier": identifier,
                "status": status,
                "issueKind": "incident" if issue_matches_incident else "project_issue",
                "liveBoard": True,
            },
        })

    return entries


def build_incident_entries_from_snapshot() -> List[Dict[str, object]]:
    snapshot_path_raw = (os.environ.get("PROJECT_MEMORY_INCIDENTS_FILE") or "").strip()
    if not snapshot_path_raw:
        return []

    data = load_json(Path(snapshot_path_raw))
    if not isinstance(data, list):
        return []

    entries: List[Dict[str, object]] = []
    for issue in data:
        if not isinstance(issue, dict):
            continue
        title = str(issue.get("title") or "").strip()
        description = str(issue.get("description") or "").strip()
        if not title:
            continue

        identifier = issue.get("identifier") or issue.get("id")
        status = str(issue.get("status") or "").strip()
        content_parts = [
            f"Issue: {identifier}",
            f"Status: {status}",
        ]
        if description:
            content_parts.append(description[:1200])

        entries.append({
            "collection": "incidents",
            "namespace": DEFAULT_NAMESPACE,
            "title": f"Incident issue: {title}",
            "content": "\n".join(content_parts),
            "category": "incident",
            "tags": ["incident", "paperclip", "snapshot"],
            "priority": 7,
            "active": True,
            "source": "paperclip-snapshot",
            "metadata": {
                "issueId": issue.get("id"),
                "identifier": identifier,
                "status": status,
            },
        })

    return entries


def dedupe_entries(entries: List[Dict[str, object]]) -> List[Dict[str, object]]:
    deduped: List[Dict[str, object]] = []
    seen = set()
    for entry in entries:
        key = entry_fingerprint(entry)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(entry)
    return deduped


def write_outputs(entries: List[Dict[str, object]]) -> Path:
    ensure_output_dir()
    output_path = EXPORTS_DIR / "project-memory-ingest.json"
    summary_path = EXPORTS_DIR / "project-memory-ingest.summary.json"

    output_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")

    counts: Dict[str, int] = {}
    for entry in entries:
        counts[entry["collection"]] = counts.get(entry["collection"], 0) + 1

    summary = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total": len(entries),
        "counts": counts,
    }
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return output_path


def upload_to_gcs(output_path: Path, summary_path: Path) -> None:
    gcs_uri = os.environ.get("PROJECT_MEMORY_GCS_URI")
    if not gcs_uri:
        return

    access_token = None
    try:
        access_token = fetch_google_access_token()
    except Exception as exc:
        print(f"OAuth token refresh failed: {exc}")

    if access_token:
        try:
            upload_file_via_gcs_json_api(output_path, gcs_uri, access_token)
            if gcs_uri.endswith(".json"):
                summary_uri = gcs_uri.replace(".json", ".summary.json")
                upload_file_via_gcs_json_api(summary_path, summary_uri, access_token)
            print(f"Uploaded ingest payload to {gcs_uri} via Google API token")
            return
        except Exception as exc:
            print(f"OAuth upload failed: {exc}")

    cmd = None
    if shutil.which("gcloud"):
        cmd = ["gcloud", "storage", "cp"]
    elif shutil.which("gsutil"):
        cmd = ["gsutil", "cp"]

    if not cmd:
        print("Skipping GCS upload (gcloud/gsutil not found).")
        return

    try:
        subprocess.run(cmd + [str(output_path), gcs_uri], check=True)
        if gcs_uri.endswith(".json"):
            summary_uri = gcs_uri.replace(".json", ".summary.json")
            subprocess.run(cmd + [str(summary_path), summary_uri], check=True)
        print(f"Uploaded ingest payload to {gcs_uri}")
    except Exception as exc:
        print(f"GCS upload failed: {exc}")


def post_batches(entries: List[Dict[str, object]], ingest_url: str, token: str) -> None:
    batch_size = 50
    max_retries = 3
    for i in range(0, len(entries), batch_size):
        batch = entries[i : i + batch_size]
        payload = json.dumps({"entries": batch}, ensure_ascii=False).encode("utf-8")
        attempt = 0
        while True:
            attempt += 1
            req = urllib.request.Request(
                ingest_url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    resp.read()
                break
            except Exception as exc:
                if attempt >= max_retries:
                    raise exc
                sleep_for = 1.5 * attempt
                print(f"Retry batch {i//batch_size + 1} after error: {exc}")
                time.sleep(sleep_for)


def main() -> None:
    entries: List[Dict[str, object]] = []
    entries.extend(build_knowledge_entries())
    entries.extend(build_code_index_entries())
    entries.extend(build_test_observation_entries())
    entries.extend(build_incident_entries_from_repo_docs())
    paperclip_entries = build_incident_entries_from_paperclip()
    if paperclip_entries:
        entries.extend(paperclip_entries)
    else:
        entries.extend(build_incident_entries_from_snapshot())
    entries = dedupe_entries(entries)

    output_path = write_outputs(entries)
    summary_path = EXPORTS_DIR / "project-memory-ingest.summary.json"
    print(f"Wrote {len(entries)} entries to {output_path}")
    upload_to_gcs(output_path, summary_path)

    ingest_url = os.environ.get("PROJECT_MEMORY_INGEST_URL")
    token = os.environ.get("ADMIN_ID_TOKEN")
    if ingest_url and token:
        print("Posting to ingestion endpoint...")
        post_batches(entries, ingest_url, token)
        print("Ingestion completed.")
    else:
        print("Skipping ingest (missing PROJECT_MEMORY_INGEST_URL or ADMIN_ID_TOKEN).")


if __name__ == "__main__":
    main()
