import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ใบกำกับภาษี (Tax Invoice) คืออะไร? ต่างจากใบเสร็จรับเงินยังไง | EzDOC',
    description: 'สรุปเรื่องใบกำกับภาษี (Tax Invoice) และใบเสร็จรับเงิน (Receipt) ต่างกันอย่างไร ใครต้องออก? ออกเมื่อไหร่? คู่มือฉบับเข้าใจง่ายสำหรับเจ้าของธุรกิจ',
    keywords: ['ใบกำกับภาษี', 'Tax Invoice', 'ใบเสร็จรับเงิน', 'Receipt', 'ออกใบกำกับภาษี', 'VAT', 'ภาษีมูลค่าเพิ่ม', 'EzDOC'],
    openGraph: {
        type: 'article',
        title: 'ใบกำกับภาษี vs ใบเสร็จรับเงิน ต่างกันยังไง? (ฉบับมือใหม่)',
        description: 'อย่าสับสน! เอกสารสองใบนี้ใช้แทนกันไม่ได้ มาดูความต่างและวิธีออกเอกสารให้ถูกต้องตามกฎหมายสรรพากร',
        url: 'https://doc.ezboq.com/articles/tax-invoice-guide',
        images: [{ url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media' }],
    },
};

export default function TaxInvoiceGuideArticle() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: 'ใบกำกับภาษี (Tax Invoice) คืออะไร? ต่างจากใบเสร็จรับเงินยังไง',
                        image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media',
                        author: {
                            '@type': 'Organization',
                            name: 'EzDOC Team',
                            url: 'https://doc.ezboq.com',
                        },
                        datePublished: '2025-01-29',
                        description: 'ทำความเข้าใจความแตกต่างสำคัญระหว่างใบกำกับภาษีและใบเสร็จรับเงิน สิ่งที่ผู้ประกอบการต้องรู้เพื่อจัดการภาษีให้ถูกต้อง',
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
                                name: 'ใบกำกับภาษี (Tax Invoice) คืออะไร?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'เอกสารสำคัญทางภาษีที่ผู้จดทะเบียน VAT ต้องออกให้ผู้ซื้อเพื่อแสดงมูลค่าสินค้าและจำนวนภาษีมูลค่าเพิ่มที่เก็บไป เพื่อใช้เป็นหลักฐานในการเครดิตภาษี',
                                },
                            },
                            {
                                '@type': 'Question',
                                name: 'ใบเสร็จรับเงินกับใบกำกับภาษี เหมือนกันไหม?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'ไม่เหมือนกัน! ใบเสร็จรับเงิน (Receipt) ยืนยันว่า "ได้รับเงินแล้ว" ส่วนใบกำกับภาษี (Tax Invoice) ยืนยันว่า "ได้ส่งมอบสินค้า/บริการและคิดภาษีแล้ว" แต่ในทางปฏิบัติมักออกคู่กัน',
                                },
                            },
                            {
                                '@type': 'Question',
                                name: 'ไม่มีบริษัท ออกใบกำกับภาษีได้ไหม?',
                                acceptedAnswer: {
                                    '@type': 'Answer',
                                    text: 'ไม่ได้ เว้นแต่บุคคลธรรมดาจะจดทะเบียนภาษีมูลค่าเพิ่ม (VAT) กับกรมสรรพากร หากยังไม่จด VAT จะออกได้เพียง "ใบเสร็จรับเงิน" หรือ "บิลเงินสด" เท่านั้น',
                                },
                            },
                        ],
                    }),
                }}
            />

            <header className="mb-10">
                <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                    ใบกำกับภาษี (Tax Invoice) vs ใบเสร็จรับเงิน (Receipt) ต่างกันยังไง? ฉบับมือใหม่
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <time dateTime="2025-01-29">29 ม.ค. 2025</time>
                    <span>•</span>
                    <span>อ่าน 6 นาที</span>
                    <span>•</span>
                    <span className="font-medium text-emerald-600">Accounting 101</span>
                </div>
            </header>

            <section className="space-y-6 text-slate-700">
                <p className="lead text-lg font-medium text-slate-600">
                    เรื่องปวดหัวอันดับ 1 ของคนเริ่มทำธุรกิจคือ &quot;เรื่องเอกสาร&quot; โดยเฉพาะคำถามโลกแตกอย่าง
                    <strong>&quot;ต้องออกใบกำกับภาษีไหม?&quot;</strong> หรือ <strong>&quot;ใช้ใบเสร็จแทนได้หรือเปล่า?&quot;</strong> วันนี้ EzDOC จะมาเคลียร์ชัดๆ ให้คุณหายงง
                </p>

                <h2 className="text-2xl font-bold text-slate-900">1. ใบเสร็จรับเงิน (Receipt)</h2>
                <p>
                    <strong>คืออะไร:</strong> เอกสารที่บอกว่า &quot;ฉันได้รับเงินจากคุณแล้วนะ&quot; <br />
                    <strong>ใครต้องออก:</strong> ทุกคน! ที่ขายของหรือให้บริการ แล้วได้รับเงิน <br />
                    <strong>ใช้ทำอะไร:</strong> เป็นหลักฐานการจ่ายเงิน เพื่อให้ลูกค้าเก็บไว้บันทึกบัญชีรายจ่าย
                </p>

                <h2 className="text-2xl font-bold text-slate-900">2. ใบกำกับภาษี (Tax Invoice)</h2>
                <p>
                    <strong>คืออะไร:</strong> เอกสารที่บอกว่า &quot;สินค้านี้มีการคิดภาษีมูลค่าเพิ่ม (VAT) 7%&quot; <br />
                    <strong>ใครต้องออก:</strong> เฉพาะธุรกิจที่ <strong>จดทะเบียนภาษีมูลค่าเพิ่ม (VAT)</strong> เท่านั้น (รายได้เกิน 1.8 ล้าน หรือจดด้วยความสมัครใจ) <br />
                    <strong>ใช้ทำอะไร:</strong> ใช้ยื่นกรมสรรพากร ผู้ซื้อใช้ลดหย่อนภาษีซื้อ (ภาษีที่ต้องจ่าย) ผู้ขายใช้นำส่งภาษีขาย
                </p>

                <div className="my-8 overflow-hidden rounded-2xl bg-indigo-50 p-6 ring-1 ring-indigo-100">
                    <h3 className="mb-3 text-lg font-bold text-indigo-800">💡 ตารางสรุปความต่าง</h3>
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-indigo-200 text-indigo-900">
                                <th className="py-2">หัวข้อ</th>
                                <th className="py-2">ใบเสร็จรับเงิน</th>
                                <th className="py-2">ใบกำกับภาษี</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-200/50">
                            <tr>
                                <td className="py-2 font-medium">เรื่องหลัก</td>
                                <td className="py-2">เรื่อง &quot;เงิน&quot; (รับเงินแล้ว)</td>
                                <td className="py-2">เรื่อง &quot;ภาษี&quot; (VAT/สิทธิทางภาษี)</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-medium">ผู้ออก</td>
                                <td className="py-2">ทุกคนที่รับเงิน</td>
                                <td className="py-2">เฉพาะผู้จด VAT เท่านั้น</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-medium">ผิดกฎหมายไหมถ้าไม่ออก?</td>
                                <td className="py-2">ผิด (ควรออกทุกครั้งที่รับเงิน)</td>
                                <td className="py-2">ผิดมาก! (มีโทษปรับและจำคุก)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h2 className="text-2xl font-bold text-slate-900">ใบกำกับภาษีอย่างย่อ vs เต็มรูป ต่างกันยังไง?</h2>
                <ul className="list-disc space-y-2 pl-5 marker:text-emerald-500">
                    <li><strong>อย่างย่อ (Abbreviated):</strong> ใช้กับลูกค้ารายย่อยทั่วไป (เช่น 7-Eleven, ร้านกาแฟ) ไม่ต้องระบุชื่อลูกค้า ใช้หักภาษีไม่ได้</li>
                    <li><strong>เต็มรูป (Full):</strong> ต้องระบุ &quot;ชื่อ ที่อยู่ เลขผู้เสียภาษี&quot; ของผู้ซื้ออย่างชัดเจน ใช้หักภาษีซื้อได้</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900">สรุป: ถ้าเพิ่งเริ่มธุรกิจ ต้องออกใบไหน?</h2>
                <p>
                    หากรายได้คุณยังไม่ถึง 1.8 ล้านบาทต่อปี และยังไม่ได้จด VAT คุณมีหน้าที่ออกแค่ <strong>&quot;ใบเสร็จรับเงิน&quot;</strong> เท่านั้น ห้ามออกใบกำกับภาษีเด็ดขาด (เพราะจะโดนข้อหาออกใบกำกับปลอม)
                </p>
                <p>
                    แต่ถ้าคุณจด VAT แล้ว คุณต้องออก <strong>&quot;ใบกำกับภาษี&quot;</strong> ทุกครั้ง หรือจะออกเป็นเอกสารชุด <strong>&quot;ใบเสร็จรับเงิน/ใบกำกับภาษี&quot;</strong> (2 in 1) เลยก็ได้ เพื่อความสะดวก
                </p>

                <h2 className="text-2xl font-bold text-slate-900">ตัวช่วยสำหรับมือใหม่</h2>
                <p>
                    ไม่อยากปวดหัวกับการจำฟอร์มเอกสาร? ให้ <strong>EzDOC</strong> ช่วยคุณ! ระบุแค่ว่าจด VAT หรือไม่จด ระบบจะเลือกฟอร์มใบเสร็จที่ถูกต้องตามกฎหมายให้อัตโนมัติ
                    พิมพ์ส่งลูกค้าผ่าน LINE ได้เลย ไม่ต้องกลัวผิดกฎสรรพากร
                </p>
            </section>
        </>
    );
}
