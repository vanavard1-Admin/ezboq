#!/usr/bin/env python3
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from ingest_project_memory import (
    DEFAULT_NAMESPACE,
    entry_fingerprint,
    parse_gcs_uri,
    read_refresh_token,
)


DEFAULT_PROJECT_ID = "ezdoc-v1-th"
OUTPUT_DIR = Path(__file__).resolve().parent / "outputs"
REPORT_PATH = OUTPUT_DIR / "project-memory-verify-report.json"

COLLECTION_MAP = {
    "project_memory": "project_memory_entries",
    "code_index": "project_code_index_entries",
    "incidents": "project_incident_entries",
    "project_issues": "project_issue_entries",
    "test_observations": "project_test_observation_entries",
}


def fetch_user_google_access_token() -> str:
    direct = (os.environ.get("GOOGLE_ACCESS_TOKEN") or "").strip()
    if direct:
        return direct

    client_id = (os.environ.get("GOOGLE_OAUTH_CLIENT_ID") or "").strip()
    client_secret = (os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET") or "").strip()
    refresh_token = read_refresh_token()
    if not client_id or not client_secret or not refresh_token:
        raise RuntimeError("Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / refresh token")

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
        body = json.load(resp)

    token = body.get("access_token")
    if not isinstance(token, str) or not token:
        raise RuntimeError("Failed to refresh Google access token")
    return token


def fetch_json(url: str, access_token: str) -> object:
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def post_json_lines(url: str, access_token: str, payload: Dict[str, object]) -> List[Dict[str, object]]:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read().decode("utf-8")

    stripped = raw.strip()
    if not stripped:
        return []

    if stripped.startswith("["):
        parsed = json.loads(stripped)
        if isinstance(parsed, list):
            return [item for item in parsed if isinstance(item, dict)]

    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    return [json.loads(line) for line in lines]


def load_gcs_payload(gcs_uri: str, access_token: str) -> Tuple[List[Dict[str, object]], Dict[str, int]]:
    parsed = parse_gcs_uri(gcs_uri)
    if not parsed:
        raise RuntimeError(f"Invalid PROJECT_MEMORY_GCS_URI: {gcs_uri}")

    bucket, object_name = parsed
    encoded_object = urllib.parse.quote(object_name, safe="")
    payload_url = f"https://storage.googleapis.com/storage/v1/b/{bucket}/o/{encoded_object}?alt=media"
    payload = fetch_json(payload_url, access_token)

    entries = payload if isinstance(payload, list) else payload.get("entries", [])
    if not isinstance(entries, list):
        raise RuntimeError("GCS payload is not a valid entry list")

    summary_counts: Dict[str, int] = {}
    if gcs_uri.endswith(".json"):
        summary_object = object_name.replace(".json", ".summary.json")
        summary_url = (
            f"https://storage.googleapis.com/storage/v1/b/{bucket}/o/"
            f"{urllib.parse.quote(summary_object, safe='')}?alt=media"
        )
        try:
            summary = fetch_json(summary_url, access_token)
            if isinstance(summary, dict) and isinstance(summary.get("counts"), dict):
                summary_counts = {
                    str(key): int(value)
                    for key, value in summary["counts"].items()
                    if isinstance(value, (int, float))
                }
        except Exception:
            summary_counts = {}

    return entries, summary_counts


def decode_firestore_value(value: Dict[str, object]) -> object:
    if "stringValue" in value:
        return value["stringValue"]
    if "integerValue" in value:
        raw = value["integerValue"]
        try:
            return int(raw)
        except Exception:
            return raw
    if "doubleValue" in value:
        raw = value["doubleValue"]
        try:
            return float(raw)
        except Exception:
            return raw
    if "booleanValue" in value:
        return bool(value["booleanValue"])
    if "nullValue" in value:
        return None
    if "timestampValue" in value:
        return value["timestampValue"]
    if "arrayValue" in value:
        values = value.get("arrayValue", {}).get("values", [])
        if not isinstance(values, list):
            return []
        return [decode_firestore_value(item) for item in values if isinstance(item, dict)]
    if "mapValue" in value:
        fields = value.get("mapValue", {}).get("fields", {})
        if not isinstance(fields, dict):
            return {}
        return {
            str(key): decode_firestore_value(raw)
            for key, raw in fields.items()
            if isinstance(raw, dict)
        }
    return value


def decode_firestore_document(collection: str, raw_doc: Dict[str, object]) -> Dict[str, object]:
    fields = raw_doc.get("fields", {})
    decoded = {
        str(key): decode_firestore_value(value)
        for key, value in fields.items()
        if isinstance(value, dict)
    } if isinstance(fields, dict) else {}

    return {
        "collection": collection,
        "title": str(decoded.get("title") or "").strip(),
        "source": str(decoded.get("source") or "").strip(),
        "metadata": decoded.get("metadata") if isinstance(decoded.get("metadata"), dict) else {},
    }


def fetch_firestore_active_docs(
    project_id: str,
    collection: str,
    access_token: str,
) -> List[Dict[str, object]]:
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:runQuery"
    )
    payload = {
        "structuredQuery": {
            "from": [{"collectionId": collection}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": "active"},
                    "op": "EQUAL",
                    "value": {"booleanValue": True},
                },
            },
            "limit": 5000,
        },
    }
    responses = post_json_lines(url, access_token, payload)
    docs: List[Dict[str, object]] = []
    for item in responses:
        doc = item.get("document")
        if isinstance(doc, dict):
            docs.append(doc)
    return docs


def build_collection_report(
    collection: str,
    expected_entries: List[Dict[str, object]],
    firestore_docs: List[Dict[str, object]],
) -> Dict[str, object]:
    expected_keys = {entry_fingerprint(entry) for entry in expected_entries}
    actual_entries = [decode_firestore_document(collection, doc) for doc in firestore_docs]
    actual_keys = [entry_fingerprint(entry) for entry in actual_entries]
    actual_unique = set(actual_keys)

    missing = sorted(expected_keys - actual_unique)
    unexpected = sorted(actual_unique - expected_keys)
    duplicates = max(0, len(actual_keys) - len(actual_unique))

    return {
        "expectedCount": len(expected_entries),
        "expectedUnique": len(expected_keys),
        "firestoreActiveDocs": len(firestore_docs),
        "firestoreUnique": len(actual_unique),
        "matchedUnique": len(expected_keys & actual_unique),
        "missingUnique": len(missing),
        "unexpectedUnique": len(unexpected),
        "duplicateDocs": duplicates,
        "sampleMissing": missing[:5],
        "sampleUnexpected": unexpected[:5],
    }


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    gcs_uri = (os.environ.get("PROJECT_MEMORY_GCS_URI") or "").strip()
    if not gcs_uri:
        print("Missing PROJECT_MEMORY_GCS_URI", file=sys.stderr)
        return 2

    project_id = (
        os.environ.get("PROJECT_MEMORY_FIRESTORE_PROJECT_ID")
        or os.environ.get("GOOGLE_CLOUD_PROJECT")
        or os.environ.get("GCLOUD_PROJECT")
        or DEFAULT_PROJECT_ID
    ).strip()
    namespace = (os.environ.get("PROJECT_MEMORY_NAMESPACE") or DEFAULT_NAMESPACE).strip()

    try:
        access_token = fetch_user_google_access_token()
        entries, gcs_summary_counts = load_gcs_payload(gcs_uri, access_token)
    except Exception as exc:
        print(f"Failed to load GCS payload: {exc}", file=sys.stderr)
        return 2

    expected_by_collection: Dict[str, List[Dict[str, object]]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        collection = str(entry.get("collection") or "").strip()
        if not collection:
            continue
        if namespace:
            entry_namespace = str(entry.get("namespace") or "").strip() or DEFAULT_NAMESPACE
            if entry_namespace != namespace:
                continue
        expected_by_collection.setdefault(collection, []).append(entry)

    report = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "gcsUri": gcs_uri,
        "firestoreProjectId": project_id,
        "namespace": namespace,
        "gcsSummaryCounts": gcs_summary_counts,
        "collections": {},
    }

    ok = True
    exact = True
    for collection, collection_path in COLLECTION_MAP.items():
        expected_entries = expected_by_collection.get(collection, [])
        try:
            firestore_docs = fetch_firestore_active_docs(project_id, collection_path, access_token)
        except Exception as exc:
            print(f"Failed to query Firestore for {collection}: {exc}", file=sys.stderr)
            return 2

        summary = build_collection_report(collection, expected_entries, firestore_docs)
        report["collections"][collection] = summary
        if summary["missingUnique"] > 0:
            ok = False
            exact = False
        if summary["unexpectedUnique"] > 0 or summary["duplicateDocs"] > 0:
            exact = False

    report["ok"] = ok
    report["exact"] = exact
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Verification report written to {REPORT_PATH}")
    for collection, summary in report["collections"].items():
        print(
            f"{collection}: expected={summary['expectedUnique']} "
            f"matched={summary['matchedUnique']} missing={summary['missingUnique']} "
            f"unexpected={summary['unexpectedUnique']} duplicates={summary['duplicateDocs']}"
        )
    print(f"ok={ok} exact={exact}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
