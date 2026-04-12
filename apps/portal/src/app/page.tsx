/* eslint-disable @next/next/no-img-element */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { sessionReady, user, profile } = useAuth();
  const [stats, setStats] = useState({ docs: 0, seconds: 0, steps: 0 });

  // Logo icon
  const logoIcon =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Flogo%20icon.png?alt=media&token=033785a0-0a9c-40d0-8acb-fa406803600d';

  // Original mascot (keep for legacy use)
  const mascotSmiling =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2Fmascot_%E0%B8%81%E0%B8%AD%E0%B8%94%E0%B8%AD%E0%B8%81%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B8%A2%E0%B8%B4%E0%B9%89%E0%B8%A1.png?alt=media&token=02e65897-1e40-48b2-81ef-7b1c32837eb3';
  const cozyTeam =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_team_fun.png?alt=media&token=4c70ad8f-9ee0-42c2-8cb9-c847106901fb';
  const cozySupport =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_support_moment.png?alt=media&token=64dbcf37-a70c-40f8-acfd-55f33ecdf995';
  const cozyDocumentFlow =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_document_flow.png?alt=media&token=6632a846-af2b-49e6-8d62-78ea7548bc70';

  const facebookIcon =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/payment-qr%2Ficon%20fb%20ig%2Ffacebook-svgrepo-com%20(1).svg?alt=media&token=4b1720f9-85fe-4a74-9195-ebbc79bd33c7';
  const instagramIcon =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/payment-qr%2Ficon%20fb%20ig%2Finstagram-1-svgrepo-com.svg?alt=media&token=5a5a780f-ba72-4c7d-9c5f-6c698cf19218';
  const lineIcon =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2Fline%20ico.png?alt=media&token=5feb348d-801e-42b3-8db6-8026d0017567';
  const lineOaLogo =
    'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2FService%20Logo-02___4.png?alt=media&token=43d26c72-a711-46bf-bdf2-218526ff1eba';
  const helperMascots = [
    {
      persona: 'devboy',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_devboy_handsup_pose.png?alt=media&token=2d9a1579-8b83-4f3b-a7f0-ff760e5e4426',
    },
    {
      persona: 'devboy',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_devboy_lazy_coding_laptop.png?alt=media&token=4504eedd-1a50-407a-b0f4-967ae84c926d',
    },
    {
      persona: 'devboy',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_devboy_scroll_dokdok_support.png?alt=media&token=71b7fffc-d100-453e-bd35-bb2ffed02499',
    },
    {
      persona: 'dokdok',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fdokdok_typing_bubble_v1.png?alt=media&token=5aab81e0-3f4d-4e99-8148-d514fa348c87',
    },
    {
      persona: 'dokdok',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_dokdok_bow_thanks.png?alt=media&token=3c6c0c11-ac8f-4561-988b-d0c51c5f72cc',
    },
    {
      persona: 'dokdok',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_dokdok_cheer_receipts.png?alt=media&token=1afe443f-2bb8-425c-a220-d1467fbb5916',
    },
    {
      persona: 'dokdok',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_dokdok_working_laptop.png?alt=media&token=97e21d7c-266e-4559-8d49-73dbcae43bf6',
    },
    {
      persona: 'duo',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_duo_devboy_dokdok_workmode.png?alt=media&token=c4a6cafe-9847-4d4c-ba8b-94d64c056e90',
    },
    {
      persona: 'freelance',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_freelancegirl_cry_overwhelmed.png?alt=media&token=0fdab7ae-b765-4414-8b46-8abfb7fce6cb',
    },
    {
      persona: 'freelance',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_freelancegirl_heart_wink.png?alt=media&token=e76852ba-01ee-450d-bb60-4c5a905ff8d1',
    },
    {
      persona: 'freelance',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_freelancegirl_shy_nervous.png?alt=media&token=d01dedd9-8821-4cec-bbed-d051330fb901',
    },
    {
      persona: 'kid',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezkid_girl_chill_tablet_v1.png?alt=media&token=3a0ce870-96f4-4bd2-8a85-e0fd43f7cca0',
    },
    {
      persona: 'kid',
      src: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fzkid_girl_cheer_jump_v1.png?alt=media&token=e12268e0-80e4-415b-aab3-1b018e3e5b38',
    },
  ];

  // Hero Section Mascots (Filter for DevBoy, Freelance, Kid)
  const heroMascotList = helperMascots.filter(m => ['devboy', 'freelance', 'kid'].includes(m.persona));
  const [heroMascotIndex, setHeroMascotIndex] = useState(0); // Start with DevBoy HandsUp (Index 0 is usually HandsUp in the list)

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min((scrollY / docHeight) * 100, 100) : 0;
        document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
        document.documentElement.style.setProperty('--scroll-progress', `${progress}%`);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let raf = 0;
    const targets = { docs: 3, seconds: 60, steps: 3 };
    const start = performance.now();
    const duration = 1400;

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setStats({
        docs: Math.round(targets.docs * ease),
        seconds: Math.round(targets.seconds * ease),
        steps: Math.round(targets.steps * ease),
      });
      if (t < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);


  return (
    <div className="relative min-h-screen bg-[#f6f7fb] text-slate-900">
      <div
        className="fixed left-0 top-0 z-50 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400"
        style={{ width: 'var(--scroll-progress, 0%)' }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'EzBOQ Documents',
            alternateName: 'EzBOQ Documents by EzBOQ',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'LINE Platform, Web Browser',
            description: 'โมดูลเอกสารของ EzBOQ สำหรับสร้างใบเสนอราคา ใบวางบิล และใบเสร็จ ผ่าน workflow เดียวกับระบบหลัก',
            featureList: 'สร้างใบเสนอราคาผ่าน LINE, ออกใบกำกับภาษี, บันทึกค่าใช้จ่าย, รายงานยอดขาย, เชื่อมต่อ LINE Official Account',
            availableOnDevice: 'Mobile, Desktop',
            countriesSupported: 'TH',
            applicationSubCategory: 'LINE Chatbot, Productivity Tool',
            fileFormat: 'PDF',
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              ratingCount: '1250',
              bestRating: '5',
              worstRating: '1',
            },
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'THB',
            },
            author: {
              '@type': 'Organization',
              name: 'EzBOQ Platform',
              url: 'https://doc.ezboq.com',
              logo: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Flogo%20icon.png?alt=media&token=033785a0-0a9c-40d0-8acb-fa406803600d',
              sameAs: [
                'https://www.facebook.com/profile.php?id=61586267506404',
                'https://www.instagram.com/ezdoc_thailand/'
              ]
            },
          }),
        }}
      />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl"
          style={{ transform: 'translateY(calc(var(--scroll-y, 0px) * 0.12))' }}
        />
        <div
          className="absolute bottom-[-10%] left-[-5%] h-80 w-80 rounded-full bg-teal-200/40 blur-3xl"
          style={{ transform: 'translateY(calc(var(--scroll-y, 0px) * 0.08))' }}
        />
        <div
          className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-200/20 blur-[120px]"
          style={{ transform: 'translateY(calc(var(--scroll-y, 0px) * 0.2))' }}
        />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-100 overflow-hidden">
            <img
              src={logoIcon}
              alt="EzBOQ Documents logo"
              className="h-12 w-12 object-contain"
              loading="eager"
            />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-wide">EzBOQ Documents</div>
            <div className="text-xs text-slate-500">Document module inside EzBOQ</div>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <a href="#how" className="hover:text-emerald-600">ทำอะไรได้บ้าง</a>
          <a href="/articles" className="hover:text-emerald-600">บทความ</a>
          <a href="#example" className="hover:text-emerald-600">ตัวอย่างการใช้งาน</a>
          <a href="#contact" className="hover:text-emerald-600">ติดต่อ</a>
        </nav>
        <a
          href="https://line.me/R/ti/p/@ezdoc"
          className="cta-primary hidden rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg md:inline-flex"
        >
          + Add LINE
        </a>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-20 md:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700">
            {sessionReady ? 'ระบบพร้อมใช้งาน' : 'กำลังเตรียมระบบ'}
          </div>

          <div className="space-y-4">
            <div className="title-wrap">
              <div className="title-label">EzBOQ Documents</div>
              <div className="title-sub">Document Module</div>
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
              โมดูลเอกสารของ EzBOQ สำหรับงานขายและงานเก็บเงิน
            </h1>
            <p className="text-base text-slate-600 md:text-lg">
              ใช้ workflow เดียวกับ EzBOQ เพื่อออกเอกสาร, สร้าง PDF, และส่งต่อให้ลูกค้าได้ทันที
            </p>


            {/* LINE Icons */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-3 rounded-2xl bg-[#00B900] px-5 py-3 shadow-lg shadow-green-500/30">
                <img
                  src={lineIcon}
                  alt="LINE"
                  className="h-8 w-8"
                />
                <span className="font-semibold text-white">LINE</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-5 py-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
                <img
                  src={lineOaLogo}
                  alt="LINE OA"
                  className="h-8 w-auto"
                />
                <span className="font-semibold text-slate-700">Official Account</span>
              </div>
            </div>
          </div>

          <div id="how" className="grid gap-4 md:grid-cols-3">
            {[
              { title: 'พิมพ์เร็ว', desc: 'พิมพ์ติดกันก็เข้าใจ: ลูกค้าแมวเป้า / อาหารแมว3000' },
              { title: 'ออก PDF', desc: 'เอกสารพร้อมส่งลูกค้าในไม่กี่วินาที' },
              { title: 'เก็บหลักฐาน', desc: 'บันทึกประวัติและลิงก์เอกสารไว้ในระบบ' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur"
              >
                <div className="text-sm font-semibold text-emerald-700">{item.title}</div>
                <div className="mt-2 text-sm text-slate-600">{item.desc}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'เอกสารหลัก', value: stats.docs, suffix: 'แบบ' },
              { label: 'เป้าหมายเวลา', value: stats.seconds, suffix: 'วินาที' },
              { label: 'ขั้นตอนจบ', value: stats.steps, suffix: 'ขั้น' },
            ].map((item) => (
              <div key={item.label} className="stat-card rounded-2xl bg-white/70 p-4 shadow-sm">
                <div className="text-xs text-slate-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {item.value}
                  <span className="text-base font-medium text-slate-500"> {item.suffix}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="https://line.me/R/ti/p/@ezdoc"
              className="cta-primary inline-flex items-center justify-center rounded-2xl px-6 py-3 text-base font-semibold text-white shadow-lg"
            >
              เพิ่มเพื่อนใน LINE
            </a>
            <a
              href="#example"
              className="cta-secondary inline-flex items-center justify-center rounded-2xl px-6 py-3 text-base font-semibold"
            >
              ดูตัวอย่างการใช้งาน
            </a>
            <a
              href={
                !sessionReady
                  ? '#'
                  : user
                    ? '/dashboard/documents'
                    : '/liff/link'
              }
              className="cta-ghost inline-flex items-center justify-center rounded-2xl px-6 py-3 text-base font-semibold"
              style={!sessionReady ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            >
              {!sessionReady
                ? 'กำลังตรวจสอบบัญชี...'
                : user
                  ? 'เข้าสู่แดชบอร์ด'
                  : 'เชื่อมต่อ LINE'}
            </a>
          </div>

          <div className="progress-strip rounded-3xl bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Step 1: เพิ่มเพื่อน</span>
              <span>Step 2: พิมพ์ข้อมูล</span>
              <span>Step 3: ได้ PDF</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
            </div>
          </div>

          <div className="scroll-indicator flex items-center gap-2 text-xs text-slate-500">
            <span>เลื่อนลงเพื่อดูเพิ่มเติม</span>
            <span className="scroll-arrow">↓</span>
          </div>
        </section>

        <section className="space-y-6 md:-mt-12 lg:-mt-20" id="example">
          <div className="flex items-center justify-center pb-4">
            <div className="relative w-full max-w-lg md:max-w-xl lg:max-w-2xl cursor-pointer transition-transform hover:scale-105 active:scale-95"
              onClick={() => setHeroMascotIndex(prev => (prev + 1) % heroMascotList.length)}
              title="คลิกเพื่อเปลี่ยนท่าทาง"
            >
              <div className="absolute inset-0 -z-10 scale-110 rounded-full bg-emerald-200/30 blur-3xl animate-pulse" />
              <img
                key={heroMascotIndex}
                src={heroMascotList[heroMascotIndex % heroMascotList.length]?.src}
                alt="EzDOC Mascot"
                className="hero-mascot w-full drop-shadow-2xl"
                loading="eager"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-[1px] shadow-xl">
            <div className="rounded-[22px] bg-white p-6">
              <div className="flex items-center gap-3">
                <img
                  src={mascotSmiling}
                  alt="EzDOC mascot"
                  className="h-10 w-10 rounded-full bg-emerald-50 p-1"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">EzDOC</div>
                  <div className="text-xs text-slate-500">ตัวอย่างการใช้งาน</div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  ลูกค้า แมวเป้า<br />
                  รายการ<br />
                  - อาหารแมว 2 x 1500<br />
                  - ค่าขนส่ง 300<br />
                  ประเภทเอกสาร ใบเสนอราคา
                </div>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  ✅ ออกเอกสารสำเร็จ<br />
                  เลขที่: QUO-2569-009<br />
                  รวม: 3,300฿
                </div>
                <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white">
                  ลิงก์ PDF พร้อมส่งลูกค้า + ทำใบวางบิลต่อได้ทันที
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur">
            <div className="text-sm font-semibold text-slate-900">คำอธิบายสั้น ๆ</div>
            <p className="mt-2 text-sm text-slate-600">
              แค่แอด LINE แล้วพิมพ์ตามตัวอย่าง ระบบจะสรุปข้อมูล ตรวจความครบถ้วน และส่ง PDF ให้ทันที
              เหมาะกับงานบริการ ร้านค้า และทีมขายที่อยากออกเอกสารไว
            </p>
          </div>
        </section>
      </main>

      {/* Features Section with Cozy Images */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold text-slate-900">ความสามารถหลัก</h2>
          <p className="mt-2 text-sm text-slate-600">
            EzDOC ช่วยให้คุณจัดการเอกสารได้ง่ายและเร็วขึ้น
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="group overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
            <img
              src={cozyDocumentFlow}
              alt="Document Flow"
              className="h-48 w-full object-cover transition group-hover:scale-105"
              loading="lazy"
            />
            <div className="p-5">
              <div className="text-base font-semibold text-slate-900">สร้างเอกสารอัตโนมัติ</div>
              <p className="mt-2 text-sm text-slate-600">
                พิมพ์ข้อมูลผ่าน LINE แล้วได้ใบเสนอราคา ใบวางบิล ใบเสร็จทันที
              </p>
            </div>
          </div>
          <div className="group overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
            <img
              src={cozyTeam}
              alt="Team Collaboration"
              className="h-48 w-full object-cover transition group-hover:scale-105"
              loading="lazy"
            />
            <div className="p-5">
              <div className="text-base font-semibold text-slate-900">ทำงานเป็นทีม</div>
              <p className="mt-2 text-sm text-slate-600">
                แชร์เอกสารและติดตามสถานะร่วมกับทีมได้ง่ายๆ
              </p>
            </div>
          </div>
          <div className="group overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
            <img
              src={cozySupport}
              alt="Support"
              className="h-48 w-full object-cover transition group-hover:scale-105"
              loading="lazy"
            />
            <div className="p-5">
              <div className="text-base font-semibold text-slate-900">ซัพพอร์ตตลอด</div>
              <p className="mt-2 text-sm text-slate-600">
                มีปัญหาหรือคำถาม พิมพ์มาได้เลย เราพร้อมช่วยเหลือ
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/50 bg-white/60 p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/50 md:p-12">
          {/* Decorative background gradients */}
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="md:max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur-sm ring-1 ring-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Web Dashboard
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                ศูนย์จัดการบนเว็บ
              </h2>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                บริหารจัดการธุรกิจของคุณได้แบบมืออาชีพ ดูแลเอกสาร ติดตามยอดขาย และปรับแต่งธุรกิจได้ในที่เดียว
              </p>
            </div>

            <a
              href={
                !sessionReady
                  ? '#'
                  : user
                    ? '/dashboard/documents'
                    : '/liff/link'
              }
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white shadow-xl transition-all hover:scale-105 hover:bg-slate-800 hover:shadow-2xl"
              style={!sessionReady ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            >
              <span className="relative z-10">
                {!sessionReady
                  ? 'กำลังตรวจสอบ...'
                  : user
                    ? 'ไปที่แดชบอร์ด'
                    : 'เข้าสู่ระบบ'}
              </span>
              <svg className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              <div className="absolute inset-0 -z-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 transition-opacity group-hover:opacity-10" />
            </a>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'แดชบอร์ด',
                desc: 'ภาพรวมเอกสารและสถานะ',
                href: '/dashboard/documents',
                icon: '📄',
                color: 'emerald',
                gradient: 'from-emerald-400 to-teal-500',
              },
              {
                title: 'โปรไฟล์ธุรกิจ',
                desc: 'ตั้งค่าโลโก้และข้อมูลบริษัท',
                href: '/dashboard/profile',
                icon: '🏢',
                color: 'violet',
                gradient: 'from-violet-400 to-fuchsia-500',
              },
              {
                title: 'ประวัติเอกสาร',
                desc: 'ค้นหาและจัดการย้อนหลัง',
                href: '/dashboard/documents',
                icon: '📂',
                color: 'amber',
                gradient: 'from-amber-400 to-orange-500',
              },
              {
                title: 'รายงาน',
                desc: 'วิเคราะห์ยอดขายกราฟสวย',
                href: '/dashboard/reports',
                icon: '📊',
                color: 'cyan',
                gradient: 'from-cyan-400 to-blue-500',
              },
            ].map((item) => (
              <a
                key={item.title}
                href={
                  !sessionReady
                    ? '#'
                    : user
                      ? item.href
                      : '/liff/link'
                }
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                style={!sessionReady ? { pointerEvents: 'none', opacity: 0.7 } : undefined}
              >
                {/* Top colored strip */}
                <div className={`absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r ${item.gradient}`} />

                {/* Glow effect on hover */}
                <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full bg-${item.color}-100/50 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                <div>
                  <div className={`relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-${item.color}-50 text-3xl shadow-inner ring-1 ring-${item.color}-100 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <span className="relative z-10 drop-shadow-sm">{item.icon}</span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-${item.color}-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>

                <div className={`mt-6 flex items-center gap-2 text-sm font-bold text-${item.color}-600 opacity-60 transition-all group-hover:opacity-100 group-hover:gap-3`}>
                  <span>เปิดใช้งาน</span>
                  <span className="text-lg leading-none">→</span>
                </div>
              </a>
            ))}
          </div>

          {user && (
            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-emerald-50/80 px-5 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200 text-emerald-700">✓</div>
              <span className="font-medium">
                เข้าสู่ระบบโดย: <span className="font-bold">{profile?.business?.name || 'ยังไม่ตั้งค่าธุรกิจ'}</span> ({user.email})
              </span>
            </div>
          )}
        </div>
      </section>


      {/* Testimonials Section */}
      <div className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-lg font-semibold leading-8 tracking-tight text-emerald-600">เสียงตอบรับจากผู้ใช้งานจริง</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              ทำไมธุรกิจกว่า 1,200 รายถึงไว้ใจ EzDOC
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-2">
              <p className="text-xl font-medium text-slate-900">
                4.9 ดาว <span className="text-yellow-500">⭐⭐⭐⭐⭐</span> (จำนวน 1,250 รีวิว)
              </p>
            </div>
          </div>
          <div className="mx-auto mt-16 grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            {/* Review 1: Nida */}
            <div className="rounded-2xl bg-white p-8 text-sm leading-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5">
              <div className="mb-4 text-emerald-500 text-xs font-semibold">⭐⭐⭐⭐⭐ 5ดาว</div>
              <blockquote className="text-slate-900">
                <p>“ใช้งานง่ายมากค่ะ ไม่เคยทำบัญชีมาก่อนก็ทำได้ ออกใบเสนอราคาใน LINE แป๊บเดียวลูกค้าอนุมัติเลย ประทับใจมากค่ะ”</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-x-4">
                <img className="h-10 w-10 rounded-full bg-slate-50 object-cover" src="https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FIMG_0923.jpg?alt=media&token=db8c0362-540b-44b0-942a-49f7212c1b76" alt="คุณนิดา" />
                <div>
                  <div className="font-semibold text-slate-900">นิดา</div>
                  <div className="text-slate-600">เจ้าของร้านของขวัญออนไลน์</div>
                </div>
              </figcaption>
            </div>

            {/* Review 2: Song */}
            <div className="rounded-2xl bg-white p-8 text-sm leading-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5">
              <div className="mb-4 text-emerald-500 text-xs font-semibold">⭐⭐⭐⭐⭐ 5ดาว</div>
              <blockquote className="text-slate-900">
                <p>“สะดวกสุดๆ ครับ เวลาไปหน้างานพอลูกค้าขอใบวางบิลก็กดส่งจากมือถือได้ทันที ไม่ต้องกลับไปทำที่ออฟฟิศ ช่วยประหยัดเวลาได้เยอะเลยครับ”</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-x-4">
                <img className="h-10 w-10 rounded-full bg-slate-50 object-cover" src="https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FIMG_0924.jpg?alt=media&token=95a94382-bdc6-4d3c-9ea8-c71d12a0ab10" alt="คุณสอง" />
                <div>
                  <div className="font-semibold text-slate-900">สอง</div>
                  <div className="text-slate-600">ทีมช่างบริการหน้างาน</div>
                </div>
              </figcaption>
            </div>

            {/* Review 3: A (Chatcharn) */}
            <div className="rounded-2xl bg-white p-8 text-sm leading-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5">
              <div className="mb-4 text-emerald-500 text-xs font-semibold">⭐⭐⭐⭐⭐ 5ดาว</div>
              <blockquote className="text-slate-900">
                <p>“ระบบเสถียรดีครับ ทีมซัพพอร์ตตอบโจทย์ไว ฟีเจอร์ครบสำหรับ SME ชอบตรงที่ไม่ต้องลงแอปให้หนักเครื่อง ใช้ผ่าน LINE ได้เลย สะดวกมาก”</p>
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-x-4">
                <img className="h-10 w-10 rounded-full bg-slate-50 object-cover" src="https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FIMG_0925.JPG?alt=media&token=cffb88a7-b33c-4075-b9ed-3cff5ad65ff9" alt="คุณเอ" />
                <div>
                  <div className="font-semibold text-slate-900">เอ</div>
                  <div className="text-slate-600">เจ้าของธุรกิจ SME</div>
                </div>
              </figcaption>
            </div>
          </div>
        </div>
      </div>


      {/* FAQ Section with JSON-LD Schema */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'EzDOC คืออะไร?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'EzDOC คือระบบออกเอกสารทางธุรกิจผ่าน LINE (LINE Document Assistant) ช่วยให้พ่อค้าแม่ค้าออนไลน์ ฟรีแลนซ์ และ SME สามารถสร้างใบเสนอราคา ใบวางบิล และใบเสร็จรับเงิน ได้ง่ายๆ เพียงพิมพ์คุยกับบอท ไม่ต้องใช้โปรแกรมบัญชีที่ซับซ้อน'
                  }
                },
                {
                  '@type': 'Question',
                  name: 'EzDOC ออกเอกสารอะไรได้บ้าง?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'รองรับเอกสารสำคัญครบวงจร: 1. ใบเสนอราคา (Quotation) 2. ใบวางบิล/ใบแจ้งหนี้ (Invoice) 3. ใบเสร็จรับเงิน (Receipt) โดยเอกสารทั้งหมดจะออกมาเป็นไฟล์ PDF พร้อมส่งให้ลูกค้าได้ทันที'
                  }
                },
                {
                  '@type': 'Question',
                  name: 'มีค่าใช้จ่ายไหม?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'เริ่มต้นใช้งานได้ฟรี! สำหรับเอกสารพื้นฐาน หากต้องการฟีเจอร์ระดับสูง เช่น การปรับแต่โลโก้, ลายเซ็นดิจิทัล, หรือรายงานสรุปยอดขาย สามารถอัปเกรดเป็นแพ็กเกจ Pro (รายเดือน/รายปี) ได้ในราคาประหยัด'
                  }
                },
                {
                  '@type': 'Question',
                  name: 'ใช้งานบนคอมพิวเตอร์ได้ไหม?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'ได้แน่นอน! EzDOC ออกแบบมาให้ใช้งานได้ทั้งบนมือถือ (ผ่าน LINE) และบนคอมพิวเตอร์ (ผ่าน Web Dashboard) ข้อมูลทั้งหมดจะเชื่อมต่อกันแบบ Real-time'
                  }
                }
              ]
            })
          }}
        />
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-slate-900">คำถามที่พบบ่อย (FAQ)</h2>
            <p className="mt-2 text-sm text-slate-600">เรื่องน่ารู้เกี่ยวกับการใช้งาน EzDOC</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-900">EzDOC คืออะไร?</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                ระบบออกเอกสารผ่าน LINE ช่วยให้ SME และฟรีแลนซ์สร้าง <span className="text-emerald-600 font-medium">ใบเสนอราคา, ใบวางบิล, ใบเสร็จ</span> ได้ง่ายๆ แค่พิมพ์แชท ไม่ต้องใช้โปรแกรมบัญชี
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">ต้องติดตั้งแอปไหม?</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                ไม่ต้อง! ใช้งานผ่าน <strong>LINE Application</strong> ที่คุณมีอยู่แล้วได้เลย หรือจะล็อกอินผ่านเว็บเพื่อดูรายงานก็ได้
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">เหมาะกับธุรกิจแบบไหน?</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                เหมาะมากกับ <strong>ร้านค้าออนไลน์, รับเหมา, ฟรีแลนซ์</strong> และธุรกิจบริการที่ต้องการความคล่องตัว ออกเอกสารได้ทุกที่ แม้ไม่มีคอมพิวเตอร์
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">ข้อมูลปลอดภัยไหม?</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                ปลอดภัยสูงสุด เพราะเราใช้มาตรฐานความปลอดภัยระดับเดียวกับธนาคาร ข้อมูลของคุณเป็นความลับและเข้าถึงได้เฉพาะคุณเท่านั้น
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20" id="contact">
        <div className="rounded-3xl border border-white/70 bg-white/70 p-8 shadow-sm backdrop-blur">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="text-lg font-semibold text-slate-900">ติดต่อเรา</div>
              <p className="mt-2 text-sm text-slate-600">
                ต้องการความช่วยเหลือ หรืออยากพูดคุยเรื่องเอกสารธุรกิจผ่าน LINE
                ติดต่อได้เลย เราพร้อมช่วยตั้งค่าให้เร็วที่สุด
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div>
                  อีเมล:{' '}
                  <a className="font-semibold text-slate-900 hover:text-emerald-700" href="mailto:admin@ezboq.com">
                    admin@ezboq.com
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="https://www.facebook.com/profile.php?id=61586267506404"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    <img src={facebookIcon} alt="Facebook" className="h-4 w-4" />
                    Facebook
                  </a>
                  <a
                    href="https://www.instagram.com/ezdoc_thailand/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    <img src={instagramIcon} alt="Instagram" className="h-4 w-4" />
                    Instagram
                  </a>
                  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                    <img src={lineIcon} alt="LINE" className="h-4 w-4" />
                    LINE
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                    <img src={lineOaLogo} alt="LINE OA" className="h-4 w-4" />
                    LINE OA
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="https://line.me/R/ti/p/@ezdoc"
                className="cta-primary rounded-2xl px-6 py-3 text-center text-base font-semibold text-white"
              >
                + Add LINE (Official)
              </a>
              <a
                href="mailto:admin@ezboq.com"
                className="cta-secondary rounded-2xl px-6 py-3 text-center text-base font-semibold"
              >
                ส่งอีเมลติดต่อ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3">
                <img src={logoIcon} alt="EzDOC" className="h-10 w-10" />
                <div>
                  <div className="font-semibold text-slate-900">EzDOC</div>
                  <div className="text-xs text-slate-500">LINE Document OS</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-xs">
                ผู้ช่วยออกเอกสารธุรกิจยอดนิยมอันดับ 1 ในไทย (LINE Document Assistant)
                <br /><br />
                📍 Bangkok, Thailand 🇹🇭
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <div className="font-semibold text-slate-900 text-sm">ลิงก์</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li><a href="#how" className="hover:text-emerald-600 transition">ทำอะไรได้บ้าง</a></li>
                <li><a href="https://lineforbusiness.com/th/" target="_blank" rel="noreferrer" className="hover:text-[#00B900] transition">LINE for Business</a></li>
                <li><a href="https://line.me/th/" target="_blank" rel="noreferrer" className="hover:text-[#00B900] transition">LINE Thailand</a></li>
                <li><a href="#example" className="hover:text-emerald-600 transition">ตัวอย่างการใช้งาน</a></li>
                <li><a href="#contact" className="hover:text-emerald-600 transition">ติดต่อเรา</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="font-semibold text-slate-900 text-sm">ข้อกำหนด</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li><a href="/privacy" className="hover:text-emerald-600 transition">นโยบายความเป็นส่วนตัว</a></li>
                <li><a href="/terms" className="hover:text-emerald-600 transition">ข้อกำหนดการใช้งาน</a></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <div className="font-semibold text-slate-900 text-sm">ติดตามเรา</div>
              <div className="mt-3 flex gap-3">
                <a
                  href="https://www.facebook.com/profile.php?id=61586267506404"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
                >
                  <img src={facebookIcon} alt="Facebook" className="h-4 w-4" />
                </a>
                <a
                  href="https://www.instagram.com/ezdoc_thailand/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
                >
                  <img src={instagramIcon} alt="Instagram" className="h-4 w-4" />
                </a>
                <a
                  href="https://line.me/R/ti/p/@ezdoc"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00B900] hover:bg-[#00a000] transition"
                >
                  <img src={lineIcon} alt="LINE" className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-10 border-t border-slate-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              © 2024-{new Date().getFullYear()} EzBOQ Team. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <a href="/privacy" className="hover:text-slate-600 transition">Privacy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-slate-600 transition">Terms</a>
              <span>•</span>
              <span>Made with 💚 in Thailand</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .title-wrap {
          display: inline-flex;
          flex-direction: column;
          gap: 4px;
          animation: titleReveal 1.2s ease-out both;
        }
        .title-label {
          font-size: 4rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.03em;
          background: linear-gradient(90deg, #10b981 0%, #14b8a6 30%, #22d3ee 60%, #10b981 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 20px 40px rgba(16, 185, 129, 0.25);
          animation: titleReveal 1.2s ease-out both, shimmer 3s ease-in-out infinite;
        }
        .title-sub {
          font-size: 0.95rem;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(15, 23, 42, 0.6);
          font-weight: 600;
          animation: titleReveal 1.4s ease-out both;
        }
        .hero-mascot {
          animation: float 6s ease-in-out infinite;
        }
        .scroll-indicator {
          opacity: 0.8;
        }
        .scroll-arrow {
          display: inline-flex;
          animation: scrollBounce 1.6s ease-in-out infinite;
        }
        .stat-card {
          animation: fadeUp 0.9s ease-out both;
        }
        .cta-primary {
          background: linear-gradient(120deg, #00b900 0%, #12c78f 50%, #2dd4bf 100%);
          box-shadow: 0 12px 24px rgba(16, 185, 129, 0.28);
          position: relative;
          overflow: hidden;
        }
        .cta-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255,255,255,0.35), transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .cta-primary:hover::after {
          opacity: 1;
        }
        .cta-secondary {
          border: 1px solid rgba(16, 185, 129, 0.4);
          background: white;
          color: #0f766e;
          box-shadow: 0 10px 20px rgba(15, 118, 110, 0.08);
        }
        .cta-ghost {
          border: 1px dashed rgba(15, 118, 110, 0.35);
          background: rgba(255, 255, 255, 0.6);
          color: #0f766e;
          transition: all 0.2s ease;
        }
        .cta-ghost:hover {
          border-color: rgba(16, 185, 129, 0.65);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 12px 24px rgba(15, 118, 110, 0.12);
        }
        .progress-strip {
          background-image: linear-gradient(120deg, rgba(16,185,129,0.08), rgba(45,212,191,0.12));
        }
        @keyframes titleReveal {
          0% { opacity: 0; transform: translateY(24px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(6px); opacity: 1; }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .title-label { font-size: 2.8rem; }
        }
      `}</style>
    </div >
  );
}
