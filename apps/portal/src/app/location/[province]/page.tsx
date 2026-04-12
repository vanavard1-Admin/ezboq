
/* eslint-disable react/no-unescaped-entities */

import Link from 'next/link';
import type { Metadata } from 'next';

type Province = {
    slug: string;
    nameTH: string;
    nameEN: string;
    description: string;
};

const PROVINCES: Province[] = [
    { slug: 'bangkok', nameTH: 'กรุงเทพมหานคร', nameEN: 'Bangkok', description: 'เมืองหลวงและศูนย์กลางธุรกิจอันดับ 1 ของไทย' },
    { slug: 'chiang-mai', nameTH: 'เชียงใหม่', nameEN: 'Chiang Mai', description: 'ศูนย์กลางธุรกิจ SME และ Startup แห่งภาคเหนือ' },
    { slug: 'phuket', nameTH: 'ภูเก็ต', nameEN: 'Phuket', description: 'เมืองท่องเที่ยวระดับโลกและธุรกิจบริการ' },
    { slug: 'chonburi', nameTH: 'ชลบุรี', nameEN: 'Chonburi', description: 'ฐานการผลิตและธุรกิจ EEC ที่สำคัญ' },
    { slug: 'khon-kaen', nameTH: 'ขอนแก่น', nameEN: 'Khon Kaen', description: 'ศูนย์กลางการค้าและบริการของอีสาน' },
    { slug: 'songkhla', nameTH: 'สงขลา', nameEN: 'Songkhla', description: 'ศูนย์กลางธุรกิจภาคใต้และชายแดน' },
    { slug: 'nakhon-ratchasima', nameTH: 'นครราชสีมา', nameEN: 'Nakhon Ratchasima', description: 'ประตูสู่อีสานและเมืองอุตสาหกรรม' },
    { slug: 'rayong', nameTH: 'ระยอง', nameEN: 'Rayong', description: 'เมืองอุตสาหกรรมและผลไม้เศรษฐกิจ' },
    { slug: 'nonthaburi', nameTH: 'นนทบุรี', nameEN: 'Nonthaburi', description: 'พื้นที่เศรษฐกิจและที่อยู่อาศัยขยายตัว' },
    { slug: 'samut-prakan', nameTH: 'สมุทรปราการ', nameEN: 'Samut Prakan', description: 'เมืองปริมณฑลและแหล่งอุตสาหกรรมสำคัญ' },
];

export async function generateStaticParams() {
    return PROVINCES.map((p) => ({ province: p.slug }));
}

type Props = {
    params: Promise<{ province: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { province } = await params;
    const p = PROVINCES.find((x) => x.slug === province) || PROVINCES[0];

    return {
        title: `🔥 โปรแกรมบัญชี ${p.nameTH} - ออกใบกำกับภาษีง่ายๆ ผ่าน LINE 2025 | EzDOC`,
        description: `กำลังหาโปรแกรมบัญชีใน${p.nameTH} อยู่ใช่ไหม? EzDOC ช่วย SME และร้านค้าใน${p.nameTH} ออกใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ ผ่าน LINE ได้ทันที ไม่ต้องลงโปรแกรม เริ่มต้นฟรี!`,
        keywords: [`โปรแกรมบัญชี ${p.nameTH}`, `ออกใบกำกับภาษี ${p.nameTH}`, `รับทำบัญชี ${p.nameTH}`, `POS ${p.nameTH}`, 'EzDOC', 'โปรแกรมขายหน้าร้าน'],
        openGraph: {
            title: `โซลูชั่นออกเอกสารอันดับ 1 สำหรับธุรกิจใน${p.nameTH} - EzDOC`,
            description: `ชาว${p.nameTH} ห้ามพลาด! วิธีจัดการเอกสารที่ง่ายที่สุด ออกบิลผ่าน LINE ได้เลย`,
            images: ['https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_workflow_bot.png?alt=media'],
        },
    };
}

export default async function LocationPage({ params }: Props) {
    const { province } = await params;
    const p = PROVINCES.find((x) => x.slug === province) || PROVINCES[0];

    return (
        <div className="min-h-screen bg-white">
            {/* Local Business Structure Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Service',
                        serviceType: 'Accounting Software & POS',
                        provider: {
                            '@type': 'Organization',
                            name: 'EzDOC',
                            url: 'https://doc.ezboq.com'
                        },
                        areaServed: {
                            '@type': 'City',
                            name: p.nameEN,
                            alternateName: p.nameTH
                        },
                        description: `บริการโปรแกรมบัญชีและออกเอกสารออนไลน์สำหรับธุรกิจใน${p.nameTH}`,
                        offers: {
                            '@type': 'Offer',
                            price: '0',
                            priceCurrency: 'THB'
                        },
                        aggregateRating: {
                            '@type': 'AggregateRating',
                            ratingValue: '4.9',
                            ratingCount: '1250',
                            bestRating: '5',
                            worstRating: '1'
                        }
                    }),
                }}
            />

            <nav className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-50">
                <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900 hover:text-emerald-600">
                        <span>EzDOC</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">for {p.nameEN}</span>
                    </Link>
                    <a
                        href="https://line.me/R/ti/p/@ezdoc"
                        className="rounded-full bg-[#00B900] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-[#00a000]"
                    >
                        LINE OA
                    </a>
                </div>
            </nav>

            <main>
                {/* Herosection */}
                <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-white py-20 lg:py-28">
                    <div className="mx-auto max-w-4xl px-6 text-center">
                        <span className="inline-block rounded-full bg-orange-100 px-4 py-1.5 text-sm font-bold text-orange-600 mb-6 shadow-sm">
                            📢 ข่าวดีสำหรับผู้ประกอบการ{p.nameTH}
                        </span>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl leading-tight">
                            ทำธุรกิจใน <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{p.nameTH}</span><br />
                            ต้องมีระบบเอกสารที่ "ฉลาด" กว่าคู่แข่ง
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
                            {p.description} ย่อมต้องการความรวดเร็ว EzDOC คือตัวช่วยออกใบเสนอราคา ใบแจ้งหนี้ และใบเสร็จ ผ่าน LINE ที่ร้านค้าใน{p.nameTH} ไว้วางใจมากที่สุด
                        </p>
                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                            <a
                                href="https://line.me/R/ti/p/@ezdoc"
                                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-4 text-base font-bold text-white shadow-xl hover:bg-slate-800 transition-all transform hover:scale-105"
                            >
                                เริ่มใช้งานฟรี (ไม่มีค่าใช้จ่ายแอบแฝง)
                            </a>
                            <Link
                                href="/articles"
                                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-4 text-base font-bold text-slate-700 hover:bg-slate-50 transition-all"
                            >
                                ดูคู่มือการใช้งาน
                            </Link>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">
                            ⭐ 4.9/5 ดาว จากผู้ใช้งานจริง 1,250+ รายทั่วประเทศ
                        </p>
                    </div>
                </section>

                {/* Localized Content */}
                <section className="py-20 bg-white">
                    <div className="mx-auto max-w-4xl px-6">
                        <div className="grid gap-12 md:grid-cols-2 items-center">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-6">ทำไมธุรกิจใน{p.nameTH} ถึงเลือก EzDOC?</h2>
                                <ul className="space-y-4">
                                    <li className="flex items-start">
                                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center mt-1">
                                            <span className="text-emerald-600 text-sm">✓</span>
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-lg font-bold text-slate-900">เข้าใจวิถีคน{p.nameTH}</h3>
                                            <p className="text-slate-600">เน้นความรวดเร็ว คุยง่าย จบงานไว ผ่าน LINE ไม่ต้องพิธีรีตองเยอะ</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center mt-1">
                                            <span className="text-emerald-600 text-sm">✓</span>
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-lg font-bold text-slate-900">รองรับธุรกิจท่องเที่ยวและบริการ</h3>
                                            <p className="text-slate-600">เหมาะมากสำหรับร้านอาหาร โรงแรม หรือทัวร์ใน{p.nameTH} ที่ต้องการออกบิลเร็วๆ ให้นักท่องเที่ยว</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center mt-1">
                                            <span className="text-emerald-600 text-sm">✓</span>
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-lg font-bold text-slate-900">ประหยัดต้นทุนค่าซอฟต์แวร์</h3>
                                            <p className="text-slate-600">เก็บเงินไว้ขยายกิจการดีกว่า มาใช้ของฟรีคุณภาพดีที่นี่</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-200 to-teal-200 rounded-2xl transform rotate-3"></div>
                                <div className="relative bg-white p-8 rounded-2xl shadow-xl ring-1 ring-slate-100">
                                    <blockquote className="text-slate-700 italic text-lg leading-loose">
                                        "เมื่อก่อนต้องจ้างทำบัญชีเดือนละหลายพัน เดี๋ยวนี้ใช้ EzDOC กดออกใบเสนอราคาให้ลูกค้าที่{p.nameTH} ได้เลยในมือถือ สะดวกมาก ลูกค้าชอบเพราะดูเป็นมืออาชีพ"
                                    </blockquote>
                                    <div className="mt-6 flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-slate-200"></div>
                                        <div>
                                            <div className="font-bold text-slate-900">คุณสมชาย (เจ้าของกิจการ)</div>
                                            <div className="text-sm text-slate-500">ผู้ใช้งานใน{p.nameTH}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900 py-20 text-center">
                    <div className="mx-auto max-w-4xl px-6">
                        <h2 className="text-3xl font-bold text-white mb-8">พร้อมยกระดับธุรกิจใน{p.nameTH} หรือยัง?</h2>
                        <a
                            href="https://line.me/R/ti/p/@ezdoc"
                            className="inline-block rounded-full bg-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 transition-all"
                        >
                            แอดไลน์ @ezdoc เลย
                        </a>
                    </div>
                </section>
            </main>
        </div>
    );
}
