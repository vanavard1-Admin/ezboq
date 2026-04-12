/* eslint-disable react/no-unescaped-entities */

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ใบวางบิล vs ใบแจ้งหนี้ (Invoice) ต่างกันอย่างไร? ใช้ตอนไหนบ้าง | EzDOC',
    description: 'ไขข้อข้องใจคนทำธุรกิจ ใบวางบิล (Billing Note) กับ ใบแจ้งหนี้ (Invoice) ใช้ต่างกันยังไง ขั้นตอนการเก็บเงินที่ถูกต้องเพื่อให้ได้เงินไวขึ้น',
    keywords: ['ใบวางบิล', 'ใบแจ้งหนี้', 'Invoice', 'Billing Note', 'วิธีวางบิล', 'เอกสารบัญชี', 'EzDOC'],
    openGraph: {
        type: 'article',
        title: 'ใบวางบิล vs ใบแจ้งหนี้ ต่างกันยังไง? (เช็คให้ชัวร์ก่อนเก็บเงิน)',
        description: 'ส่งผิดใบ ระวังไม่ได้เงิน! มาดูวิธีแยกแยะและเลือกใช้เอกสารเก็บเงินให้ถูกต้อง จ่าย-รับ จบในขั้นตอนเดียว',
        url: 'https://doc.ezboq.com/articles/invoice-billing',
        images: [{ url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media' }],
    },
};

export default function InvoiceBillingArticle() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: 'ใบวางบิล vs ใบแจ้งหนี้ (Invoice) ต่างกันอย่างไร?',
                        image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media',
                        author: {
                            '@type': 'Organization',
                            name: 'EzDOC Team',
                            url: 'https://doc.ezboq.com',
                        },
                        datePublished: '2025-01-29',
                        description: 'ทำความเข้าใจความแตกต่างของใบวางบิลและใบแจ้งหนี้ เพื่อระบบการเก็บเงินที่มีประสิทธิภาพ ลดความสับสนของเอกสาร',
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
                                name: 'ใบวางบิล (Billing Note) คืออะไร?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'เอกสารสรุปยอดรายการสินค้าหรือบริการทั้งหมดที่ลูกค้าค้างชำระในรอบนั้นๆ เพื่อแจ้งยอดรวมให้ลูกค้ารู้ก่อนโอนเงิน หรือใช้นัดรับเช็ค',
                                },
                            },
                            {
                                '@type': 'Question',
                                name: 'ใบแจ้งหนี้ (Invoice) คืออะไร?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'เอกสารที่แจ้งให้ลูกค้าทราบว่าถึงกำหนดชำระค่าสินค้า/บริการรายการนั้นๆ แล้ว มักใช้หลังจากส่งมอบสินค้าเสร็จสิ้น แต่ยังไม่ได้รับเงิน',
                                },
                            },
                            {
                                '@type': 'Question',
                                name: 'ต้องออกทั้งคู่ไหม?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'ไม่จำเป็นเสมอไป ขึ้นอยู่กับการตกลงและรอบการชำระเงิน ถ้าซื้อขายจบเป็นครั้งๆ อาจใช้ใบแจ้งหนี้ใบเดียว แต่ถ้าเป็นเครดิตเทอม หรือรวมหลายบิลจ่ายทีเดียว ต้องใช้ใบวางบิลสรุปยอด',
                                },
                            },
                        ],
                    }),
                }}
            />

            <header className="mb-10">
                <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                    ใบวางบิล (Billing Note) vs ใบแจ้งหนี้ (Invoice) ต่างกันอย่างไร? ใช้ผิด ชีวิตเปลี่ยน!
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <time dateTime="2025-01-29">29 ม.ค. 2025</time>
                    <span>•</span>
                    <span>อ่าน 5 นาที</span>
                    <span>•</span>
                    <span className="font-medium text-emerald-600">Smart Finance</span>
                </div>
            </header>

            <section className="space-y-6 text-slate-700">
                <p className="lead text-lg font-medium text-slate-600">
                    "พี่ครับ วางบิลเลยไหม?" หรือ "ขอ Invoice หน่อยครับ?" สองคำนี้ทำเอามือใหม่หลายคนสับสน
                    สรุปอันไหนคืออันไหน? ต้องส่งใบไหนก่อน? วันนี้เราจะมาจัดลำดับขั้นตอนการ "ทวงเงิน" แบบมือโปรฯ กัน
                </p>

                <h2 className="text-2xl font-bold text-slate-900">1. Invoice (ใบแจ้งหนี้) = "แจ้งให้รู้ว่าต้องจ่าย"</h2>
                <p>
                    นี่คือเอกสารแรกที่เกิดขึ้นหลังจากคุณส่งของหรือทำงานเสร็จ บอกลูกค้าว่า "งานจบนานแล้ว เชิญชำระเงินตามยอดนี้"
                    <br />
                    <strong>ใช้เมื่อไหร่:</strong> ทันทีที่ส่งสินค้า/บริการเสร็จสมบูรณ์
                    <br />
                    <strong>สำคัญยังไง:</strong> เป็นตัวตั้งต้นของหนี้สินทางธุรกิจ
                </p>

                <h2 className="text-2xl font-bold text-slate-900">2. Billing Note (ใบวางบิล) = "สรุปยอดเพื่อเก็บเงิน"</h2>
                <p>
                    นี่คือเอกสารที่ "รวบยอด" หรือ "นัดวันจ่าย" มักใช้กับบริษัทใหญ่ๆ ที่มีรอบการจ่ายเงิน (เช่น วางบิลทุกวันที่ 25 จ่ายเงินทุกสิ้นเดือน)
                    <br />
                    <strong>ใช้เมื่อไหร่:</strong> เมื่อถึงกำหนดรอบวางบิล หรือต้องการรวม Invoice หลายใบมาเก็บเงินทีเดียว
                    <br />
                    <strong>สำคัญยังไง:</strong> ถ้าไม่วางบิล ลูกค้าบางเจ้า (โดยเฉพาะบริษัทใหญ่) จะไม่ทำเรื่องจ่ายเช็คให้คุณ!
                </p>

                <div className="my-8 rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-100">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">🚀 สเต็ปการเดินเอกสาร (Workflow) ที่ถูกต้อง</h3>
                    <ol className="relative ml-3 border-l-2 border-slate-200">
                        <li className="mb-6 ml-6">
                            <span className="absolute -left-2 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 ring-4 ring-white"></span>
                            <h4 className="font-semibold text-slate-900">Step 1: ส่งสินค้า/บริการ</h4>
                            <p className="text-sm text-slate-500">พร้อมเอกสาร <strong>ใบส่งของ (Delivery Note)</strong></p>
                        </li>
                        <li className="mb-6 ml-6">
                            <span className="absolute -left-2 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 ring-4 ring-white"></span>
                            <h4 className="font-semibold text-blue-700">Step 2: แจ้งเก็บเงิน</h4>
                            <p className="text-sm text-slate-500">ส่ง <strong>ใบแจ้งหนี้ (Invoice)</strong> เพื่อยืนยันยอดหนี้</p>
                        </li>
                        <li className="mb-6 ml-6">
                            <span className="absolute -left-2 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-4 ring-white"></span>
                            <h4 className="font-semibold text-amber-700">Step 3: วางบิล (ถ้ามี)</h4>
                            <p className="text-sm text-slate-500">ส่ง <strong>ใบวางบิล (Billing Note)</strong> เพื่อนัดวันรับเช็ค/โอนเงิน</p>
                        </li>
                        <li className="ml-6">
                            <span className="absolute -left-2 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white"></span>
                            <h4 className="font-semibold text-emerald-700">Step 4: รับเงิน</h4>
                            <p className="text-sm text-slate-500">ออก <strong>ใบเสร็จรับเงิน (Receipt)</strong> ให้ลูกค้า ถือว่าจบงาน!</p>
                        </li>
                    </ol>
                </div>

                <h2 className="text-2xl font-bold text-slate-900">จำเป็นต้องแยก 4 ใบเลยเหรอ?</h2>
                <p>
                    ถ้าคุณขายของให้ลูกค้าทั่วไป (B2C) หรือ SME เล็กๆ... <strong>"ไม่จำเป็นครับ"</strong>
                </p>
                <p>
                    คุณสามารถรวบขั้นตอนได้! เช่นใช้เอกสารชุด <strong>"ใบแจ้งหนี้/ใบวางบิล"</strong> ใบเดียวจบ หรือถ้าขายสดก็ข้ามไป <strong>ใบเสร็จรับเงิน</strong> เลย EzDOC ออกแบบมาให้ยืดหยุ่น คุณเลือกได้ว่าจะใช้สเต็ปไหน
                </p>

                <h2 className="text-2xl font-bold text-slate-900">ทวงเงินให้ไว ด้วย EzDOC</h2>
                <p>
                    อย่ารอจนลืม! ส่งเอกสารแจ้งหนี้แบบ <strong>Online Link</strong> ผ่าน LINE ไปให้ลูกค้าทันทีที่คุยจบ ลูกค้ากดดูเอกสารได้เลยในมือถือ ไม่ต้องรอไปรษณีย์ ไม่ต้องไฟล์หาย ยิ่งเอกสารภึงไว เงินก็เข้ากระเป๋าไวขึ้น
                </p>
            </section>
        </>
    );
}
