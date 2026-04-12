/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว | EzDOC",
  description: "นโยบายความเป็นส่วนตัวของ EzDOC ผู้ช่วยเอกสารผ่าน LINE",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-slate-500 mb-8">อัปเดตล่าสุด: 29 มกราคม 2569</p>

        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. ภาพรวม</h2>
            <p>
              EzDOC เป็นผู้ช่วยออกเอกสารธุรกิจผ่าน LINE นโยบายนี้อธิบายว่าเราเก็บข้อมูลอะไร
              ใช้งานอย่างไร และคุณมีตัวเลือกอะไรบ้าง
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. ข้อมูลที่เราเก็บ</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>ตัวระบุผู้ใช้ LINE และข้อมูลโปรไฟล์ที่จำเป็นสำหรับการเชื่อมบัญชี</li>
              <li>ข้อความที่คุณส่งถึง EzDOC (ข้อความ, รูปภาพ, ไฟล์แนบ) เพื่อสร้างเอกสาร</li>
              <li>ข้อมูลเอกสารที่คุณระบุ (ชื่อลูกค้า, รายการ, ยอดรวม, หมายเหตุ)</li>
              <li>Log การทำงานที่จำเป็นสำหรับความปลอดภัยและการแก้ไขปัญหา</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. วิธีที่เราใช้ข้อมูล</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>ให้บริการสร้างและส่งเอกสาร และปรับปรุงบริการ</li>
              <li>ยืนยันความเป็นเจ้าของบัญชีและป้องกันการใช้งานที่ไม่เหมาะสม</li>
              <li>ให้การสนับสนุนลูกค้าและแก้ไขปัญหา</li>
              <li>ปฏิบัติตามข้อกำหนดทางกฎหมายเมื่อจำเป็น</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. การแชร์ข้อมูล</h2>
            <p>
              <strong>เราไม่ขายข้อมูลของคุณ</strong> เราอาจแชร์ข้อมูลกับผู้ให้บริการที่เชื่อถือได้
              (เช่น ระบบคลาวด์และผู้ให้บริการส่งข้อความ) เฉพาะที่จำเป็นสำหรับการดำเนินงานบริการเท่านั้น
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. การจัดเก็บและการเก็บรักษา</h2>
            <p>
              ข้อมูลจะถูกจัดเก็บในโครงสร้างพื้นฐานคลาวด์ที่ปลอดภัย เราเก็บรักษาข้อมูล
              เท่าที่จำเป็นเพื่อให้บริการ ปฏิบัติตามข้อกำหนดทางกฎหมาย หรือแก้ไขข้อพิพาท
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. ความปลอดภัย</h2>
            <p>
              เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูล รวมถึงการควบคุม
              การเข้าถึงและการเข้ารหัสระหว่างการส่งข้อมูล ไม่มีระบบใดที่ปลอดภัย 100%
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. สิทธิ์ของคุณ</h2>
            <p>
              คุณสามารถขอเข้าถึง แก้ไข หรือลบข้อมูลของคุณได้ตามที่กฎหมายกำหนด
              ติดต่อเราได้ตามช่องทางด้านล่าง
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. ติดต่อ</h2>
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
            <span className="font-medium text-slate-700">Privacy</span>
            <Link href="/terms" className="hover:text-slate-700">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
