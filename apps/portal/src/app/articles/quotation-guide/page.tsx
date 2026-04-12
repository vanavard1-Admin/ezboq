/* eslint-disable react/no-unescaped-entities */

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'วิธีทําใบเสนอราคา (Quotation) ให้ดูโปรฯ อนุมัติไวใน 3 นาที | EzDOC',
    description: 'แจกเทคนิคออกใบเสนอราคา (Quotation) อย่างไรให้ลูกค้าประทับใจ ปิดการขายไว พร้อมตัวอย่างฟอร์มที่ถูกต้อง เหมาะสำหรับฟรีแลนซ์และ SME',
    keywords: ['ใบเสนอราคา', 'Quotation', 'วิธีทำใบเสนอราคา', 'แบบฟอร์มใบเสนอราคา', 'ออกใบเสนอราคา', 'Gen Quotation Online', 'EzDOC'],
    openGraph: {
        type: 'article',
        title: 'วิธีทําใบเสนอราคา (Quotation) ให้ดูโปรฯ อนุมัติไวใน 3 นาที',
        description: 'ทำไมส่งใบเสนอราคาไปแล้วเงียบ? มาดูเทคนิคลับที่ช่วยให้ใบเสนอราคาของคุณดูเป็นมืออาชีพและปิดการขายได้จริง',
        url: 'https://doc.ezboq.com/articles/quotation-guide',
        images: [{ url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media' }],
    },
};

export default function QuotationGuideArticle() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: 'วิธีทำใบเสนอราคา (Quotation) ให้ดูโปรฯ อนุมัติไวใน 3 นาที',
                        image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media',
                        author: {
                            '@type': 'Organization',
                            name: 'EzDOC Team',
                            url: 'https://doc.ezboq.com',
                        },
                        datePublished: '2025-01-29',
                        description: 'คู่มือการทำใบเสนอราคาให้ถูกต้องและน่าเชื่อถือ เทคนิคการตั้งราคาและเงื่อนไขเพื่อให้ลูกค้าตัดสินใจง่ายขึ้น',
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
                                name: 'ใบเสนอราคา (Quotation) คืออะไร?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'เอกสารที่ผู้ขายส่งให้ผู้ซื้อเพื่อแจ้งราคาและเงื่อนไขของสินค้าหรือบริการ เป็นขั้นตอนแรกที่สำคัญในการเจรจาธุรกิจก่อนเกิดการซื้อขายจริง',
                                },
                            },
                            {
                                '@type': 'Question',
                                name: 'ใบเสนอราคาต้องมีข้อมูลอะไรบ้าง?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: '1. ข้อมูลผู้ขายและลูกค้า 2. เลขที่เอกสารและวันที่ 3. รายละเอียดสินค้า/บริการ 4. ราคาและยอดรวม 5. เงื่อนไขการชำระเงินและการส่งมอบ',
                                },
                            },
                            {
                                '@type': 'Question',
                                name: 'ทำใบเสนอราคาบนมือถือได้ไหม?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'ได้! ด้วย EzDOC คุณสามารถสร้างใบเสนอราคาผ่าน LINE บนมือถือได้ทันที ไม่ต้องเปิดคอมฯ ระบบจะจัดหน้ากระดาษและคำนวณเงินให้อัตโนมัติ',
                                },
                            },
                        ],
                    }),
                }}
            />

            <header className="mb-10">
                <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                    วิธีทำใบเสนอราคา (Quotation) ให้ดูโปรฯ อนุมัติไวใน 3 นาที
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <time dateTime="2025-01-29">29 ม.ค. 2025</time>
                    <span>•</span>
                    <span>อ่าน 4 นาที</span>
                    <span>•</span>
                    <span className="font-medium text-emerald-600">SME Guide</span>
                </div>
            </header>

            <section className="space-y-6 text-slate-700">
                <p className="lead text-lg font-medium text-slate-600">
                    "ขอใบเสนอราคาหน่อยครับ" ประโยคนี้คือสัญญาณว่าเงินกำลังจะเข้ากระเป๋า! แต่ถ้าคุณยังมัวแต่งม Excel หรือทำเอกสารหน้าตาบ้านๆ
                    ลูกค้าอาจจะเปลี่ยนใจไปหาคู่แข่งได้ วันนี้ EzDOC จะมาแชร์วิธีทำ <strong>ใบเสนอราคา (Quotation)</strong> ให้มัดใจลูกค้าอยู่หมัด
                </p>

                <h2 className="text-2xl font-bold text-slate-900">ใบเสนอราคา (Quotation) คืออะไร? สำคัญแค่ไหน?</h2>
                <p>
                    <strong>ใบเสนอราคา</strong> คือเอกสาร "เปิดเกม" ทางธุรกิจ เป็นสิ่งแรกที่ลูกค้าเห็นความมืออาชีพของคุณ
                    ไม่ใช่แค่กระดาษบอกราคา แต่มันคือสัญญาใจที่บอกว่า "ฉันจะส่งมอบของดี ในราคานี้ ภายใต้เงื่อนไขนี้"
                </p>

                <h2 className="text-2xl font-bold text-slate-900">5 จุด "ต้องมี" ในใบเสนอราคามาตรฐาน</h2>
                <ul className="list-disc space-y-2 pl-5 marker:text-emerald-500">
                    <li><strong>Header ชัดเจน:</strong> โลโก้บริษัท (ถ้ามี) ชื่อ ที่อยู่ เบอร์โทรที่ติดต่อได้จริง</li>
                    <li><strong>เลขที่เอกสาร (Run No.):</strong> ห้ามซ้ำกันเด็ดขาด (เช่น QT-2025001) เพื่อให้อ้างอิงง่าย</li>
                    <li><strong>ข้อมูลลูกค้า:</strong> ชื่อผู้ติดต่อ ชื่อบริษัทลูกค้า สำคัญมากคือ "ต้องสะกดให้ถูก"</li>
                    <li><strong>Scope งานที่ละเอียด:</strong> อย่าเขียนแค่ "ค่าบริการ" แต่ควรระบุบว่า "ค่าบริการทำเว็บไซต์ รวม Hosting 1 ปี" ลูกค้าจะได้ไม่ถามซ้ำ</li>
                    <li><strong>Term & Condition:</strong> ยืนยันราคากี่วัน? มัดจำเท่าไหร่? ส่งงานเมื่อไหร่? ระบุให้ชัดเพื่อกันปัญหาทีหลัง</li>
                </ul>

                <div className="my-8 rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-100">
                    <h3 className="mb-2 text-lg font-bold text-amber-800">⚠️ จุดตายที่ฟรีแลนซ์ชอบพลาด!</h3>
                    <p className="text-amber-900">
                        "ลืมใส่วันหมดอายุใบเสนอราคา" ทำให้ลูกค้าดึงเช็ง ผ่านไป 3 เดือนของขึ้นราคาแล้วลูกค้าเพิ่งมาอนุมัติ เราจะขาดทุนทันที!
                        ควรระบุเสมอว่า <strong>"ราคานี้ยืนยันภายใน 15 หรือ 30 วัน"</strong>
                    </p>
                </div>

                <h2 className="text-2xl font-bold text-slate-900">ทำใบเสนอราคา "เร็ว" มีชัยไปกว่าครึ่ง</h2>
                <p>
                    สถิติบอกว่า ผู้ที่ส่งใบเสนอราคาเป็น <strong>เจ้าแรก</strong> มีโอกาสปิดการขายได้มากกว่า 50%
                    เพราะลูกค้าจะใช้ราคาของคุณเป็น "ตัวตั้ง" ในการเปรียบเทียบเจ้าอื่น
                </p>
                <p>
                    แต่ถ้าคุณต้องกลับถึงบ้านถึงจะเปิดคอมฯ ทำเอกสารได้... คุณช้าไปแล้ว!
                </p>

                <h2 className="text-2xl font-bold text-slate-900">ทางเลือกใหม่: ออกใบเสนอราคาผ่าน LINE กับ EzDOC</h2>
                <p>
                    จะดีกว่าไหม? ถ้าคุณทำใบเสนอราคาเสร็จตั้งแต่คุยกับลูกค้าจบ... บนมือถือเครื่องเดียว!
                </p>
                <ul className="list-disc space-y-2 pl-5 marker:text-emerald-500">
                    <li>✅ พิมพ์ปุ๊บ ได้ไฟล์ PDF ปั๊บ (มีโลโก้+ลายเซ็นคุณครบ)</li>
                    <li>✅ ระบบรันเลขที่เอกสารให้อัตโนมัติ (ไม่ต้องจำว่าถึงเลขไหนแล้ว)</li>
                    <li>✅ เปลี่ยนสถานะเป็น "ใบวางบิล" หรือ "ใบเสร็จ" ได้ในคลิกเดียว เมื่อลูกค้าตกลง</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900">สรุป</h2>
                <p>
                    การทำ <strong>ใบเสนอราคา</strong> ที่ดี ไม่ใช่แค่เรื่องของตัวเลข แต่คือเรื่องของ "ความน่าเชื่อถือ" และ "ความไว"
                    ถ้าคุณทำเอกสารสวย ชัดเจน และส่งไว ลูกค้าก็พร้อมจะเชื่อใจและโอนเงินให้คุณง่ายขึ้น
                </p>
            </section>
        </>
    );
}
