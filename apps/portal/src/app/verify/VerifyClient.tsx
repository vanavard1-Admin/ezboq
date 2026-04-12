'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerificationKind = "document" | "tax-summary" | "wht-certificate";

type VerificationRecord = {
  kind: VerificationKind;
  fingerprint: string;
  businessName: string | null;
  renderVersion: string | null;
  templateVersion: string | null;
  recordedAt: string | null;
  documentId?: string | null;
  documentNo?: string | null;
  documentType?: string | null;
  documentStatus?: string | null;
  issueDate?: string | null;
  totalAmount?: number | null;
  monthKey?: string | null;
  monthLabel?: string | null;
  periodKey?: string | null;
  periodLabel?: string | null;
  supplierName?: string | null;
  payableVat?: number | null;
  outputVat?: number | null;
  inputVat?: number | null;
  totalWht?: number | null;
  totalBase?: number | null;
  itemCount?: number | null;
};

type VerifySuccess = {
  ok: true;
  verified: true;
  source: "record" | "document-fallback";
  record: VerificationRecord;
};

type VerifyFailure = {
  ok: false;
  verified: false;
  code?: string;
  message?: string;
};

type VerifyState =
  | { requestKey: string; status: "idle" | "loading" }
  | { requestKey: string; status: "success"; data: VerifySuccess }
  | { requestKey: string; status: "error"; error: VerifyFailure };

const KIND_LABELS: Record<VerificationKind, { title: string; subtitle: string }> = {
  document: {
    title: "ตรวจสอบเอกสาร EzDOC",
    subtitle: "Document Verification",
  },
  "tax-summary": {
    title: "ตรวจสอบรายงานภาษี EzDOC",
    subtitle: "Tax Summary Verification",
  },
  "wht-certificate": {
    title: "ตรวจสอบหนังสือรับรองหัก ณ ที่จ่าย",
    subtitle: "WHT Certificate Verification",
  },
};

function normalizeKind(params: {
  rawKind: string;
  month: string;
  period: string;
  no: string;
  id: string;
}): VerificationKind | "" {
  const normalized = params.rawKind.toLowerCase();
  if (normalized === "document") return "document";
  if (normalized === "tax-summary" || normalized === "tax_summary" || normalized === "tax") {
    return "tax-summary";
  }
  if (
    normalized === "wht-certificate" ||
    normalized === "wht_certificate" ||
    normalized === "wht"
  ) {
    return "wht-certificate";
  }
  if (params.month) return "tax-summary";
  if (params.period) return "wht-certificate";
  if (params.no || params.id) return "document";
  return "";
}

function formatMoney(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildRowsFromRecord(record: VerificationRecord): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];

  if (record.businessName) rows.push({ label: "กิจการ", value: record.businessName });

  if (record.kind === "document") {
    if (record.documentNo) rows.push({ label: "เลขเอกสาร", value: record.documentNo });
    if (record.documentId) rows.push({ label: "Reference ID", value: record.documentId });
    if (record.documentType) rows.push({ label: "ประเภทเอกสาร", value: record.documentType });
    if (record.documentStatus) rows.push({ label: "สถานะ", value: record.documentStatus });
    if (record.issueDate) rows.push({ label: "วันที่ออกเอกสาร", value: record.issueDate });
    if (typeof record.totalAmount === "number") {
      rows.push({ label: "ยอดรวม", value: formatMoney(record.totalAmount) });
    }
  }

  if (record.kind === "tax-summary") {
    if (record.monthLabel || record.monthKey) {
      rows.push({ label: "งวดรายงาน", value: record.monthLabel || record.monthKey || "-" });
    }
    if (typeof record.outputVat === "number") {
      rows.push({ label: "VAT ขาย", value: formatMoney(record.outputVat) });
    }
    if (typeof record.inputVat === "number") {
      rows.push({ label: "VAT ซื้อ", value: formatMoney(record.inputVat) });
    }
    if (typeof record.payableVat === "number") {
      rows.push({ label: "ภาษีที่ต้องชำระ", value: formatMoney(record.payableVat) });
    }
    if (typeof record.totalWht === "number") {
      rows.push({ label: "หัก ณ ที่จ่ายรวม", value: formatMoney(record.totalWht) });
    }
  }

  if (record.kind === "wht-certificate") {
    if (record.periodLabel || record.periodKey) {
      rows.push({ label: "งวดภาษี", value: record.periodLabel || record.periodKey || "-" });
    }
    if (record.supplierName) rows.push({ label: "ผู้รับเงิน", value: record.supplierName });
    if (typeof record.totalBase === "number") {
      rows.push({ label: "ยอดเงินก่อนหักภาษี", value: formatMoney(record.totalBase) });
    }
    if (typeof record.totalWht === "number") {
      rows.push({ label: "ภาษีหัก ณ ที่จ่าย", value: formatMoney(record.totalWht) });
    }
    if (typeof record.itemCount === "number") {
      rows.push({ label: "จำนวนรายการ", value: String(record.itemCount) });
    }
  }

  rows.push({ label: "Fingerprint", value: record.fingerprint });
  if (record.renderVersion) rows.push({ label: "Render Version", value: record.renderVersion });
  if (record.templateVersion) rows.push({ label: "Template Version", value: record.templateVersion });
  if (record.recordedAt) rows.push({ label: "ตรวจพบในระบบเมื่อ", value: formatDate(record.recordedAt) });

  return rows;
}

function buildRowsFromQuery(params: {
  kind: VerificationKind | "";
  no: string;
  id: string;
  month: string;
  period: string;
  fingerprint: string;
}): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];

  if (params.kind === "document") {
    if (params.no) rows.push({ label: "เลขเอกสารจาก QR", value: params.no });
    if (params.id) rows.push({ label: "Reference ID จาก QR", value: params.id });
  }
  if (params.kind === "tax-summary" && params.month) {
    rows.push({ label: "งวดรายงานจาก QR", value: params.month });
  }
  if (params.kind === "wht-certificate" && params.period) {
    rows.push({ label: "งวดภาษีจาก QR", value: params.period });
  }
  if (params.fingerprint) rows.push({ label: "Fingerprint จาก QR", value: params.fingerprint });

  return rows;
}

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const rawKind = searchParams.get("kind") || "";
  const fingerprint = (searchParams.get("fp") || "").toUpperCase();
  const no = searchParams.get("no") || "";
  const id = searchParams.get("id") || "";
  const month = searchParams.get("month") || "";
  const period = searchParams.get("period") || "";
  const inferredKind = normalizeKind({ rawKind, month, period, no, id });

  const requestKey = [inferredKind, fingerprint, no, id, month, period].join("|");
  const [state, setState] = useState<VerifyState>({ requestKey: "", status: "idle" });
  const invalidQueryError = useMemo(
    () =>
      !inferredKind || !fingerprint
        ? {
            ok: false as const,
            verified: false as const,
            code: "INVALID_QR",
            message: "ลิงก์ตรวจสอบนี้ไม่มีข้อมูลเพียงพอ",
          }
        : null,
    [fingerprint, inferredKind],
  );

  useEffect(() => {
    if (invalidQueryError) return;

    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("kind", inferredKind);
    params.set("fp", fingerprint);
    if (no) params.set("no", no);
    if (id) params.set("id", id);
    if (month) params.set("month", month);
    if (period) params.set("period", period);

    fetch(`/v1/verify?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as VerifySuccess | VerifyFailure;
        if (!response.ok) {
          throw data;
        }
        setState({ requestKey, status: "success", data: data as VerifySuccess });
      })
      .catch((error: VerifyFailure | DOMException) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const apiError =
          error && typeof error === "object" && "verified" in error
            ? (error as VerifyFailure)
            : null;
        const fallbackError =
          error instanceof Error
            ? {
                ok: false as const,
                verified: false as const,
                code: "NETWORK_ERROR",
                message: error.message || "ไม่สามารถตรวจสอบกับระบบ EzDOC ได้ในขณะนี้",
              }
            : {
                ok: false as const,
                verified: false as const,
                code: "NETWORK_ERROR",
                message: "ไม่สามารถตรวจสอบกับระบบ EzDOC ได้ในขณะนี้",
              };
        setState({
          requestKey,
          status: "error",
          error: apiError || fallbackError,
        });
      });

    return () => controller.abort();
  }, [fingerprint, id, inferredKind, invalidQueryError, month, no, period, requestKey]);

  const resolvedState: VerifyState = invalidQueryError
    ? { requestKey, status: "error", error: invalidQueryError }
    : state.requestKey !== requestKey
      ? { requestKey, status: "loading" }
      : state;

  const kindMeta = inferredKind
    ? KIND_LABELS[inferredKind]
    : {
        title: "ตรวจสอบ QR ของ EzDOC",
        subtitle: "EzDOC Verification",
      };

  const verifiedRows =
    resolvedState.status === "success" ? buildRowsFromRecord(resolvedState.data.record) : [];
  const queryRows = buildRowsFromQuery({
    kind: inferredKind,
    no,
    id,
    month,
    period,
    fingerprint,
  });

  const isVerified = resolvedState.status === "success";
  const failureMessage =
    resolvedState.status === "error"
      ? resolvedState.error.message || "ไม่พบ record นี้ในระบบ EzDOC"
      : "";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_55%)] text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
        <div className="w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_40%),linear-gradient(135deg,#0f172a,#1e293b)] px-8 py-8 text-white">
            <div className="text-xs uppercase tracking-[0.28em] text-emerald-200">EzDOC Verify</div>
            <h1 className="mt-3 text-3xl font-semibold">{kindMeta.title}</h1>
            <p className="mt-2 text-sm text-slate-200">{kindMeta.subtitle}</p>
          </div>

          <div className="space-y-8 px-8 py-8">
            {resolvedState.status === "loading" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-700">
                กำลังตรวจสอบกับระบบ EzDOC...
              </div>
            ) : null}

            {isVerified ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-900">
                เอกสารอ้างอิงนี้ผ่านการยืนยันจากระบบ EzDOC แล้ว
                <br />
                {resolvedState.status === "success" && resolvedState.data.source === "record"
                  ? "ข้อมูลด้านล่างดึงจาก verification record ที่สร้างตอน render PDF"
                  : "ข้อมูลด้านล่างยืนยันจาก snapshot เอกสารปัจจุบันในระบบ EzDOC"}
              </div>
            ) : null}

            {resolvedState.status === "error" ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-900">
                ยังไม่สามารถยืนยันเอกสารนี้จากระบบ EzDOC ได้
                <br />
                {failureMessage}
              </div>
            ) : null}

            {verifiedRows.length > 0 ? (
              <div className="space-y-4">
                {verifiedRows.map((row) => (
                  <div
                    key={`${row.label}:${row.value}`}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
                  >
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      {row.label}
                    </div>
                    <div className="break-all font-mono text-sm text-slate-900">{row.value}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {!isVerified && queryRows.length > 0 ? (
              <div className="space-y-4">
                {queryRows.map((row) => (
                  <div
                    key={`${row.label}:${row.value}`}
                    className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
                  >
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
                      {row.label}
                    </div>
                    <div className="break-all font-mono text-sm text-amber-950">{row.value}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
              ถ้าผลไม่ผ่าน ทั้งที่เป็น PDF จริงจากระบบ ให้ลอง generate เอกสารฉบับล่าสุดอีกครั้ง
              <br />
              สำหรับไฟล์เก่าที่ออกก่อนเปิดระบบ verify อาจต้อง re-export เพื่อสร้าง verification record ใหม่
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                กลับหน้า EzDOC
              </Link>
              <a
                href="mailto:admin@ezboq.com"
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                ติดต่อทีมงาน
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
