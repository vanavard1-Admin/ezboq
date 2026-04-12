'use client';

import Image from 'next/image';

const mascotUrl =
  'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2Fmascot_%E0%B8%81%E0%B8%AD%E0%B8%94%E0%B8%AD%E0%B8%81%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B8%A2%E0%B8%B4%E0%B9%89%E0%B8%A1.png?alt=media&token=02e65897-1e40-48b2-81ef-7b1c32837eb3';

export default function LinkLineDeprecatedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-6 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-2xl shadow-emerald-100/60">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
          <Image src={mascotUrl} alt="EzDOC Mascot" width={72} height={72} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">ลิงก์นี้เปลี่ยนแล้ว</h1>
        <p className="mt-3 text-sm text-slate-600">
          ลิงก์เก่าเลิกใช้แล้ว กรุณากลับไปที่แชท LINE แล้วกดปุ่ม
          <span className="font-semibold text-emerald-600"> “เชื่อมต่อบัญชี” </span>
          อีกครั้ง ระบบจะพาไปหน้าล็อกอินอัตโนมัติ
        </p>

        <div className="mt-6 space-y-3">
          <a
            href="https://line.me/R/ti/p/@ezdoc"
            className="block w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/80 transition hover:bg-emerald-700"
          >
            เปิด LINE Official Account
          </a>
          <p className="text-xs text-slate-500">
            ถ้าเปิดจากเบราว์เซอร์ ให้กลับไป LINE แล้วกดเชื่อมต่อใหม่อีกครั้ง
          </p>
        </div>
      </div>
    </div>
  );
}
