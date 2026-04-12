import Link from 'next/link';

export default function ArticlesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            {
                                '@type': 'ListItem',
                                position: 1,
                                name: 'Home',
                                item: 'https://doc.ezboq.com',
                            },
                            {
                                '@type': 'ListItem',
                                position: 2,
                                name: 'Articles',
                                item: 'https://doc.ezboq.com/articles',
                            }
                        ],
                    }),
                }}
            />
            {/* Article Navigation / Header */}
            <nav className="border-b border-slate-200 bg-white shadow-sm">
                <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 hover:text-emerald-600">
                        <span>←</span>
                        <span>EzDOC Home</span>
                    </Link>
                    <div className="text-sm font-medium text-slate-500">บทความน่ารู้</div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="mx-auto max-w-4xl px-6 py-12">
                <article className="prose prose-slate prose-lg mx-auto rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 md:p-12">
                    {children}
                </article>
            </main>

            {/* Article Footer / CTA */}
            <footer className="border-t border-slate-200 bg-white py-12">
                <div className="mx-auto max-w-4xl px-6 text-center">
                    <h3 className="text-xl font-semibold text-slate-900">อยากเริ่มใช้ Mobile POS ง่ายๆ?</h3>
                    <p className="mt-2 text-slate-600">
                        EzDOC ช่วยให้คุณออกเอกสารขายผ่าน LINE ได้ทันที ไม่ต้องซื้อเครื่องแพงๆ
                    </p>
                    <div className="mt-6 flex justify-center gap-4">
                        <a
                            href="https://line.me/R/ti/p/@ezdoc"
                            className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700 hover:shadow-emerald-500/40"
                        >
                            ทดลองใช้ฟรีผ่าน LINE
                        </a>
                        <Link
                            href="/"
                            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            ดูฟีเจอร์ทั้งหมด
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
