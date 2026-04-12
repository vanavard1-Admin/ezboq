/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ข้อกำหนดการใช้งาน | EzDOC",
  description: "ข้อกำหนดการใช้งานของ EzDOC ผู้ช่วยเอกสารผ่าน LINE",
};

export default function TermsPage() {
  const logoIcon =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Flogo%20icon.png?alt=media&token=033785a0-0a9c-40d0-8acb-fa406803600d';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img src={logoIcon} alt="EzDOC" className="h-8 w-8" />
            <span className="font-semibold text-slate-900">EzDOC</span>
          </Link>
          <Link href="/" className="text-sm text-emerald-600 hover:text-emerald-700">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">ข้อกำหนดการใช้งาน</h1>
        <p className="text-slate-500 mb-8">อัปเดตล่าสุด: 29 มกราคม 2569</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. การยอมรับข้อกำหนด</h2>
            <p>
              การใช้ EzDOC ถือว่าคุณยอมรับข้อกำหนดเหล่านี้ หากคุณไม่เห็นด้วย กรุณาหยุดใช้บริการ
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. คำอธิบายบริการ</h2>
            <p>
              EzDOC ให้บริการสร้างและส่งเอกสารธุรกิจผ่าน LINE ฟีเจอร์ต่างๆ อาจมีการเปลี่ยนแปลง
              หรืออัปเดตโดยไม่ต้องแจ้งล่วงหน้า
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. ความรับผิดชอบของผู้ใช้</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>ให้ข้อมูลที่ถูกต้องสำหรับเอกสาร</li>
              <li>ห้ามอัปโหลดเนื้อหาที่ผิดกฎหมาย เป็นอันตราย หรือไม่ได้รับอนุญาต</li>
              <li>รักษาความปลอดภัยของบัญชีและแจ้งกิจกรรมที่น่าสงสัย</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. ข้อสงวนสิทธิ์</h2>
            <p>
              บริการนี้ให้บริการ &quot;ตามสภาพที่เป็นอยู่&quot; เราไม่รับประกันว่าบริการจะทำงาน
              อย่างต่อเนื่องหรือปราศจากข้อผิดพลาด
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. การจำกัดความรับผิด</h2>
            <p>
              ภายใต้ขอบเขตสูงสุดที่กฎหมายอนุญาต EzDOC จะไม่รับผิดชอบต่อความเสียหาย
              ทางอ้อมหรือความเสียหายที่เป็นผลสืบเนื่อง
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. การยกเลิกบริการ</h2>
            <p>
              เราอาจระงับหรือยกเลิกการเข้าถึงหากมีการละเมิดข้อกำหนดเหล่านี้ หรือหากกฎหมายกำหนด
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. ติดต่อ</h2>
            <p>
              📧 อีเมล: <a href="mailto:admin@ezboq.com" className="text-emerald-600 hover:text-emerald-700">admin@ezboq.com</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-6">
        <div className="mx-auto max-w-4xl px-6 flex items-center justify-between text-sm text-slate-500">
          <span>© 2024-{new Date().getFullYear()} EzBOQ Team</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-700">Privacy</Link>
            <span className="font-medium text-slate-700">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
