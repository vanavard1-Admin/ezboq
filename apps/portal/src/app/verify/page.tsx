import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyClient from "./VerifyClient";

export const metadata: Metadata = {
  title: "Verify Reference | EzDOC",
  description: "ตรวจสอบข้อมูลอ้างอิงเอกสารและรายงานจาก QR ของ EzDOC",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VerifyClient />
    </Suspense>
  );
}
