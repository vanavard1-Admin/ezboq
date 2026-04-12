import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'บทความน่ารู้: เคล็ดลับธุรกิจ SME ภาษี และงานเอกสาร | EzDOC',
    description: 'รวมบทความสาระน่ารู้สำหรับเจ้าของธุรกิจ SME ฟรีแลนซ์ และร้านค้าออนไลน์ เรื่องการทำบัญชี ภาษี ใบกำกับภาษี และเทคนิคการเพิ่มยอดขายด้วยเครื่องมือ Digital',
    keywords: ['บทความธุรกิจ', 'ความรู้ SME', 'ภาษีเบื้องต้น', 'บัญชีฟรีแลนซ์', 'เทคนิคขายออนไลน์', 'EzDOC Blog'],
    openGraph: {
        type: 'website',
        title: 'EzDOC Knowledge Hub: คลังความรู้เพื่อธุรกิจยุคใหม่',
        description: 'อัพสกิลธุรกิจของคุณด้วยบทความเจาะลึก เรื่องบัญชี ภาษี และเครื่องมือ Digital ที่จะช่วยให้คุณทำงานง่ายขึ้น',
        url: 'https://doc.ezboq.com/articles',
        images: [{ url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media' }],
    },
};

const articles = [
    {
        slug: 'mobile-pos',
        title: 'Mobile POS คืออะไร? เจาะลึกระบบขายหน้าร้านยุคใหม่',
        desc: 'ไม่ต้องลงทุนซื้อเครื่องเป็นหมื่น! ทำความรู้จัก Mobile POS ที่เปลี่ยนมือถือของคุณเป็นเครื่องคิดเงินอัจฉริยะ',
        tag: 'Business Tips',
        color: 'emerald',
        date: '29 ม.ค. 2025'
    },
    {
        slug: 'quotation-guide',
        title: 'วิธีทำใบเสนอราคา (Quotation) ให้ดูโปรฯ อนุมัติไวใน 3 นาที',
        desc: 'เทคนิคการออกใบเสนอราคาที่ไม่ใช่แค่บอกราคา แต่ช่วยปิดการขายได้จริง พร้อมเช็คลิสต์จุดที่ห้ามพลาด',
        tag: 'SME Guide',
        color: 'amber',
        date: '29 ม.ค. 2025'
    },
    {
        slug: 'tax-invoice-guide',
        title: 'ใบกำกับภาษี vs ใบเสร็จรับเงิน ต่างกันยังไง? ฉบับมือใหม่',
        desc: 'เรื่องภาษีไม่ต้องปวดหัว เคลียร์ชัดๆ ว่าใครต้องออกใบไหน ใบกำกับภาษีเต็มรูปกับอย่างย่อต่างกันอย่างไร',
        tag: 'Accounting 101',
        color: 'indigo',
        date: '29 ม.ค. 2025'
    },
    {
        slug: 'invoice-billing',
        title: 'ใบวางบิล vs ใบแจ้งหนี้ (Invoice) ใช้ต่างกันอย่างไร?',
        desc: 'วางระบบการเก็บเงินให้เป๊ะ! สรุปขั้นตอนการเดินเอกสารตั้งแต่แจ้งหนี้ วางบิล จนถึงรับเงิน',
        tag: 'Smart Finance',
        color: 'blue',
        date: '29 ม.ค. 2025'
    },
    {
        slug: 'sme-accounting',
        title: 'หลุดพ้นจาก Excel! โปรแกรมบัญชีฉบับพกพาสำหรับ SME',
        desc: 'เปลี่ยนการทำบัญชีที่น่าเบื่อให้กลายเป็นเรื่องง่าย จบได้ใน LINE ไม่ต้องจ้างนักบัญชีแพงๆ',
        tag: 'Productivity',
        color: 'teal',
        date: '29 ม.ค. 2025'
    },
    {
        slug: 'line-oa-commerce',
        title: 'ปิดการขายบน LINE OA ให้ปัง! ด้วยระบบอัตโนมัติ',
        desc: 'เคล็ดลับแม่ค้าออนไลน์: เปลี่ยน LINE OA ธรรมดาให้เป็นเครื่องผลิตเงิน ด้วยฟีเจอร์ออกบิลและตัดสต็อก',
        tag: 'Online Selling',
        color: 'rose',
        date: '29 ม.ค. 2025'
    },
    {
        slug: 'document-management',
        title: 'ระบบจัดการเอกสาร (DMS) - เลิกกองกระดาษ เป็น Digital 100%',
        desc: 'หมดปัญหาเอกสารหาย หาไม่เจอ ด้วยระบบจัดเก็บเอกสารบน Cloud ที่ปลอดภัยและค้นหาง่าย',
        tag: 'Digital Transformation',
        color: 'cyan',
        date: '29 ม.ค. 2025'
    },
];

export default function ArticlesIndex() {
    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-10">
            <div className="mx-auto max-w-6xl px-6">
                <header className="mb-12 text-center">
                    <h1 className="text-3xl font-bold text-slate-900 md:text-5xl">
                        คลังความรู้เพื่อธุรกิจ <span className="text-emerald-600">EzDOC</span>
                    </h1>
                    <p className="mt-4 text-lg text-slate-600">
                        รวมบทความ เทคนิค และเคล็ดลับการจัดการธุรกิจ SME ภาษี และงานเอกสารให้เป็นเรื่องง่าย
                    </p>
                </header>

                {/* Tools Section */}
                <section className="mx-auto max-w-6xl px-6 py-12">
                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl">🧮</div>
                        <h2 className="text-2xl font-bold text-slate-900">เครื่องมือ (Free Tools)</h2>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <a href="/tools/vat-calculator" className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/50 ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 h-16 w-16 rounded-full bg-orange-50 blur-xl transition-all group-hover:bg-orange-100"></div>
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600">เครื่องคำนวณ VAT 7%</h3>
                            <p className="mt-2 text-sm text-slate-500">ถอด VAT หรือคิด VAT เพิ่มได้ทันที แม่นยำ รวดเร็ว</p>
                            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                                ใช้งานเลย <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </a>
                    </div>
                </section>

                {/* Locations Section */}
                <section className="mx-auto max-w-6xl px-6 py-8 border-t border-slate-100">
                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl">📍</div>
                        <h2 className="text-2xl font-bold text-slate-900">พื้นที่ให้บริการ (Service Area)</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                        {[
                            { name: 'กรุงเทพมหานคร', slug: 'bangkok' },
                            { name: 'เชียงใหม่', slug: 'chiang-mai' },
                            { name: 'ภูเก็ต', slug: 'phuket' },
                            { name: 'ชลบุรี', slug: 'chonburi' },
                            { name: 'ขอนแก่น', slug: 'khon-kaen' },
                            { name: 'สงขลา', slug: 'songkhla' },
                            { name: 'นครราชสีมา', slug: 'nakhon-ratchasima' },
                            { name: 'ระยอง', slug: 'rayong' },
                            { name: 'นนทบุรี', slug: 'nonthaburi' },
                            { name: 'สมุทรปราการ', slug: 'samut-prakan' }
                        ].map((loc) => (
                            <a
                                key={loc.slug}
                                href={`/location/${loc.slug}`}
                                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                            >
                                {loc.name}
                                <span className="text-slate-300">→</span>
                            </a>
                        ))}
                    </div>
                </section>

                {/* Articles Grid */}
                <section className="mx-auto max-w-6xl px-6 py-12 border-t border-slate-100">
                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">📚</div>
                        <h2 className="text-2xl font-bold text-slate-900">บทความล่าสุด (Articles)</h2>
                    </div>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {articles.map((article) => (
                            <a
                                key={article.slug}
                                href={`/articles/${article.slug}`}
                                className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className={`h-2 w-full bg-${article.color}-500`} />
                                <div className="flex flex-1 flex-col p-6">
                                    <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        <span className={`text-${article.color}-600`}>{article.tag}</span>
                                        <span>•</span>
                                        <span>{article.date}</span>
                                    </div>
                                    <h2 className="mb-3 text-xl font-bold text-slate-900 group-hover:text-emerald-600">
                                        {article.title}
                                    </h2>
                                    <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-500">
                                        {article.desc}
                                    </p>
                                    <div className="mt-auto flex items-center text-sm font-semibold text-emerald-600">
                                        อ่านต่อ <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>

                <div className="mt-20 rounded-3xl bg-emerald-600 px-6 py-12 text-center text-white shadow-lg shadow-emerald-600/20 md:px-12">
                    <h2 className="text-2xl font-bold md:text-3xl">พร้อมยกระดับธุรกิจของคุณหรือยัง?</h2>
                    <p className="mt-4 text-emerald-100">
                        เริ่มต้นใช้งาน EzDOC วันนี้ เปลี่ยนงานเอกสารที่ยุ่งยาก ให้ง่ายเหมือนคุยกับเพื่อน
                    </p>
                    <a
                        href="https://line.me/R/ti/p/@ezdoc"
                        className="mt-8 inline-block rounded-full bg-white px-8 py-3 text- font-bold text-emerald-700 shadow-md transition hover:bg-emerald-50 hover:shadow-lg"
                    >
                        ทดลองใช้ฟรีผ่าน LINE
                    </a>
                </div>
            </div>
        </div>
    );
}
