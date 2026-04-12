/* eslint-disable react/no-unescaped-entities */

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ระบบจัดการเอกสาร (DMS) - เลิกกองกระดาษ เปลี่ยนมาเป็น Digital 100% | EzDOC',
    description: 'ปฏิวัติการทำงานด้วยระบบจัดการเอกสาร (Document Management System) ที่ทันสมัย ค้นหาง่าย ไม่ต้องกลัวเอกสารหาย ประหยัดพื้นที่จัดเก็บ',
    keywords: ['ระบบจัดการเอกสาร', 'DMS', 'Document Management', 'เก็บเอกสารออนไลน์', 'Paperless', 'สำนักงานไร้กระดาษ', 'EzDOC'],
    openGraph: {
        type: 'article',
        title: 'เอกสารหาย? หาไม่เจอ? แก้ได้ด้วยระบบจัดการเอกสาร (DMS)',
        description: 'หยุดเสียเวลารื้อตู้เอกสาร! เปลี่ยนมาเก็บทุกอย่างบน Cloud ค้นหาเจอใน 1 วินาที ทำงานได้จากทุกมุมโลก',
        url: 'https://doc.ezboq.com/articles/document-management',
        images: [{ url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media' }],
    },
};

export default function DocumentManagementArticle() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: 'ระบบจัดการเอกสาร (DMS) เปลี่ยนออฟฟิศให้เป็น Paperless',
                        image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media',
                        author: {
                            '@type': 'Organization',
                            name: 'EzDOC Team',
                            url: 'https://doc.ezboq.com',
                        },
                        datePublished: '2025-01-29',
                        description: 'เรียนรู้ประโยชน์ของระบบจัดการเอกสารอิเล็กทรอนิกส์ การลดต้นทุนกระดาษและการเพิ่มประสิทธิภาพการทำงานในองค์กร',
                    }),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: [
                            {
                                '@type': 'Question',
                                name: 'ระบบจัดการเอกสาร (DMS) คืออะไร?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'ระบบซอฟต์แวร์ที่ใช้จัดเก็บ จัดการ และติดตามเอกสารอิเล็กทรอนิกส์ แทนการเก็บเป็นกระดาษ ช่วยให้ค้นหาข้อมูลได้รวดเร็วและปลอดภัย',
                                },
                            },
                            {
                                '@type': 'Question',
                                name: 'ทำไมต้องทำ Paperless?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'เพื่อลดต้นทุนค่ากระดาษและหมึกพิมพ์, ลดพื้นที่จัดเก็บ, ป้องกันเอกสารสูญหายหรือเสียหายจากภัยพิบัติ, และช่วยรักษาสิ่งแวดล้อม',
                                },
                            },
                            {
                                '@type': 'Question',
                                name: 'เอกสารดิจิทัลใช้แทนกระดาษได้จริงไหม?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'จริง! กฎหมายรองรับการใช้อิเล็กทรอนิกส์ไฟล์ (e-Document) ในการทำธุรกิจและยื่นภาษี (e-Tax Invoice) ได้อย่างสมบูรณ์',
                                },
                            },
                        ],
                    }),
                }}
            />

            <header className="mb-10">
                <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                    ระบบจัดการเอกสาร (DMS) - เลิกกองกระดาษ เปลี่ยนมาเป็น Digital 100%
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <time dateTime="2025-01-29">29 ม.ค. 2025</time>
                    <span>•</span>
                    <span>อ่าน 3 นาที</span>
                    <span>•</span>
                    <span className="font-medium text-emerald-600">Digital Transformation</span>
                </div>
            </header>

            <section className="space-y-6 text-slate-700">
                <p className="lead text-lg font-medium text-slate-600">
                    คุณเคยเสียเวลาเดินหาแฟ้มเอกสารเก่าๆ เกิน 10 นาทีไหม? หรือเคยเจอปัญหา "ใบสำคัญหาย" จนปิดงบไม่ได้รึเปล่า?
                    ถ้าใช่... ถึงเวลาที่คุณต้องรู้จักกับ <strong>DMS (Document Management System)</strong>
                </p>

                <h2 className="text-2xl font-bold text-slate-900">ปัญหาของ "กระดาษ" ที่คุณอาจมองข้าม</h2>
                <ul className="list-disc space-y-2 pl-5 marker:text-red-500">
                    <li><strong>แพง:</strong> ค่ากระดาษ ค่าหมึก ค่าแฟ้ม ค่าตู้เก็บของ รวมๆ แล้วปีละหลายบาท</li>
                    <li><strong>ช้า:</strong> จะหาเอกสารย้อนหลัง 2 ปี ต้องรื้อห้องเก็บของใหม่หมด</li>
                    <li><strong>เสี่ยง:</strong> ไฟไหม้ น้ำท่วม ปลวกกิน = ข้อมูลธุรกิจหายวับไปกับตา</li>
                    <li><strong>ไม่คล่องตัว:</strong> WFH ไม่ได้ เพราะเอกสารอยู่ที่ออฟฟิศ</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900">DMS คือทางออก</h2>
                <p>
                    ระบบจัดการเอกสาร หรือ DMS คือการย้ายทุกอย่างขึ้นไปอยู่บน <strong>Cloud</strong>
                    ให้คุณเข้าถึงเอกสารได้จากทุกที่ บนโลกใบนี้ (ที่มีอินเทอร์เน็ต)
                </p>

                <div className="my-8 rounded-2xl bg-cyan-50 p-6 ring-1 ring-cyan-100">
                    <h3 className="mb-3 text-lg font-bold text-cyan-800">✨ ข้อดีเมื่อเปลี่ยนเป็น Digital</h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-200 text-xs font-bold text-cyan-800">1</span>
                            <span><strong>Searchable:</strong> ค้นหาด้วย Keyword เจอภายใน 0.5 วินาที ไม่ต้องจำเลขที่เอกสาร</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-200 text-xs font-bold text-cyan-800">2</span>
                            <span><strong>Secure:</strong> กำหนดสิทธิ์ได้ว่าใครมีสิทธิ์ดู หรือแก้ไขเอกสารไหน ป้องกันข้อมูลรั่วไหล</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-200 text-xs font-bold text-cyan-800">3</span>
                            <span><strong>Eco-friendly:</strong> ลดการตัดต้นไม้ ภาพลักษณ์องค์กรรักษ์โลก</span>
                        </li>
                    </ul>
                </div>

                <h2 className="text-2xl font-bold text-slate-900">เริ่มยังไง? ต้องซื้อเซิร์ฟเวอร์ไหม?</h2>
                <p>
                    ข่าวดีคือ... <strong>ไม่ต้องครับ!</strong>
                </p>
                <p>
                    แค่เริ่มใช้ <strong>EzDOC</strong> คุณก็ได้ระบบ DMS ขนาดเล็กไปใช้งานทันที เอกสารทุกใบที่คุณสร้างผ่าน LINE
                    จะถูกจัดเก็บเข้าสู่ Cloud โดยอัตโนมัติ แยกหมวดหมู่ ค้นหาได้ง่าย และส่งต่อให้ฝ่ายบัญชีได้ทันที
                    โดยไม่ต้องปริ้นท์ออกมาแม้แต่ใบเดียว
                </p>
                <p>
                    ก้าวสู่ยุค <strong>Paperless Office</strong> อย่างแท้จริง เริ่มต้นได้ตั้งแต่วันนี้ที่ปลายนิ้วคุณ
                </p>
            </section>
        </>
    );
}
