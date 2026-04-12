import type { Metadata } from 'next';
import Link from 'next/link';
import VatCalculator from './calculator';

export const metadata: Metadata = {
    title: 'เครื่องคำนวณ VAT 7% (รวม/แยก) - แม่นยำ ทันที | EzDOC Tools',
    description: 'เครื่องมือคำนวณภาษีมูลค่าเพิ่ม (VAT) 7% ออนไลน์ ถอด VAT หรือคิด VAT เพิ่มได้ทันที ใช้งานง่าย แม่นยำ รองรับทั้งการคำนวณแบบรวมภาษี (Include) และแยกภาษี (Exclude)',
    keywords: ['เครื่องคิดเลข VAT', 'คำนวณ VAT', 'ถอด VAT', 'วิธีคิด VAT 7%', 'สูตร VAT', 'VAT Calculator', 'ภาษีมูลค่าเพิ่ม'],
    openGraph: {
        title: 'เครื่องคำนวณ VAT 7% ออนไลน์ - คิดปุ๊บ รู้ปั๊บ | EzDOC',
        description: 'คำนวณ VAT ง่ายๆ รู้ยอดก่อน/หลังภาษีทันที ไม่ต้องกดเครื่องคิดเลขให้ปวดหัว',
        type: 'website',
        url: 'https://doc.ezboq.com/tools/vat-calculator',
        images: [{ url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media' }],
    },
};

export default function VatCalculatorPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* WebApplication Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebApplication',
                        name: 'เครื่องคำนวณ VAT 7% (Thailand VAT Calculator)',
                        url: 'https://doc.ezboq.com/tools/vat-calculator',
                        applicationCategory: 'FinanceApplication',
                        operatingSystem: 'All',
                        description: 'คำนวณภาษีมูลค่าเพิ่ม (VAT) 7% ง่ายๆ ถอด VAT หรือ คิด VAT เพิ่ม ได้ทันที แม่นยำ รวดเร็ว',
                        offers: {
                            '@type': 'Offer',
                            price: '0',
                            priceCurrency: 'THB',
                        },
                        featureList: 'คำนวณ VAT ในและนอก, ถอด VAT, คิดภาษีมูลค่าเพิ่ม',
                        author: {
                            '@type': 'Organization',
                            name: 'EzDOC',
                            url: 'https://doc.ezboq.com'
                        }
                    }),
                }}
            />

            <nav className="border-b border-slate-200 bg-white shadow-sm">
                <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 hover:text-emerald-600">
                        <span>←</span>
                        <span>EzDOC Home</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/articles" className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition">บทความ</Link>
                        <span className="text-sm font-medium text-emerald-600">Free Tools</span>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-2xl px-6 py-12">
                <VatCalculator />

                <div className="mt-12 text-center">
                    <h3 className="text-lg font-semibold text-slate-900">อยากออกใบกำกับภาษีต้องทำไง?</h3>
                    <p className="mt-2 text-slate-600">EzDOC ช่วยคุณออกใบกำกับภาษี ใบเสนอราคา และใบเสร็จได้ง่ายๆ ผ่าน LINE</p>
                    <div className="mt-6 flex justify-center gap-4">
                        <a
                            href="https://line.me/R/ti/p/@ezdoc"
                            className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700 hover:shadow-emerald-500/40"
                        >
                            เริ่มใช้งานฟรี
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}
