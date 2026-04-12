/* eslint-disable @next/next/no-img-element */

'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Users,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    Loader2,
    BarChart3,
    Bell,
    Search,
    BadgePercent,
    Wallet,
    Percent,
    Home,
    Sun,
    Moon,
    Monitor,
    Plus,
    Users2,
} from 'lucide-react';
import { useDeferredValue, useEffect, useRef, useState, Suspense } from 'react';
import { useTheme } from 'next-themes';
import { notificationsRepo, type AppNotification } from '@/lib/repos/notifications.repo';
import { isRuntimeDevBypassEnabled } from '@/lib/runtimeDevBypass';

function DashboardSearchForm({
    initialQuery,
    pathname,
    searchParamsString,
    searchPlaceholder,
    clearLabel,
}: {
    initialQuery: string;
    pathname: string;
    searchParamsString: string;
    searchPlaceholder: string;
    clearLabel: string;
}) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const deferredSearchQuery = useDeferredValue(searchQuery);

    useEffect(() => {
        const nextValue = deferredSearchQuery.trim();
        if (nextValue === initialQuery) return;

        const handle = window.setTimeout(() => {
            const params = new URLSearchParams(searchParamsString);
            if (nextValue) {
                params.set('q', nextValue);
            } else {
                params.delete('q');
            }
            const query = params.toString();
            router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
        }, 350);

        return () => window.clearTimeout(handle);
    }, [deferredSearchQuery, initialQuery, pathname, router, searchParamsString]);

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                setSearchQuery((current) => current.trim());
            }}
            className="group hidden items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 transition hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-500/10 sm:flex"
        >
            <Search className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
            <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-40 bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none md:w-56"
                aria-label={searchPlaceholder}
            />
            {searchQuery && (
                <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={clearLabel}
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </form>
    );
}

function DashboardLayoutContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile, signOut, sessionReady } = useAuth();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileCreateOpen, setIsMobileCreateOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [showHelpCard, setShowHelpCard] = useState(true);
    const [heroPoseIndex, setHeroPoseIndex] = useState(0);
    const [notificationItems, setNotificationItems] = useState<AppNotification[]>([]);
    const notificationsRef = useRef<HTMLDivElement | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setMounted(true));
        return () => window.cancelAnimationFrame(frame);
    }, []);

    // Load notifications and poll every 60s
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const items = await notificationsRepo.getNotifications();
            if (!cancelled) setNotificationItems(items);
        };
        load();
        const interval = window.setInterval(load, 60_000);
        return () => { cancelled = true; window.clearInterval(interval); };
    }, []);

    const handleMarkAllRead = () => {
        notificationsRepo.markAllAsRead(notificationItems);
        setNotificationItems((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    const ThemeIcon = !mounted ? Monitor : theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
    const uiLang = profile?.business?.language === 'en' ? 'en' : 'th';
    const copy = uiLang === 'en' ? {
        clearSearch: 'Clear search',
        themeSystem: 'System',
        themeDark: 'Dark',
        themeLight: 'Light',
        themePrefix: 'Theme',
        home: 'Home',
        profile: 'Profile',
        customers: 'Customers',
        documents: 'Documents',
        expenses: 'Expenses',
        subscription: 'Plans',
        tax: 'Tax',
        reports: 'Reports',
        team: 'Team',
        dashboard: 'Dashboard',
        searchCustomers: 'Search customers...',
        searchDocuments: 'Search documents...',
        businessLabel: 'Business',
        noBusiness: 'No active business',
        signOut: 'Sign out',
        welcomeBack: 'Welcome back',
        lineAccount: 'LINE OA',
        notifications: 'Notifications',
        markAllRead: 'Mark all as read',
        emptyNotifications: 'No notifications right now',
        heroChip: 'EzBOQ Documents',
        heroTitleMain: 'Document module',
        heroTitleSub: 'for your business',
        heroSubtitle: 'Manage documents, business data, and customer records inside the EzBOQ suite.',
        heroStep: 'Start in 3 steps',
        heroFast: 'Fast documents',
        heroRealtime: 'Real-time tracking',
        heroHelp: 'Need help? Use the button at the bottom-right anytime',
        mainMenu: 'More',
        quotation: 'Quotation',
        billing: 'Billing Note',
        receipt: 'Receipt',
        helpTitle: 'Need help?',
        helpDesc: 'If something feels off, contact us right away.',
        contactAdmin: 'Contact admin',
    } : {
        clearSearch: 'ล้างคำค้นหา',
        themeSystem: 'ระบบ',
        themeDark: 'มืด',
        themeLight: 'สว่าง',
        themePrefix: 'ธีม',
        home: 'หน้าหลัก',
        profile: 'โปรไฟล์',
        customers: 'ลูกค้า',
        documents: 'เอกสาร',
        expenses: 'รายจ่าย',
        subscription: 'แพ็กเกจ',
        tax: 'ภาษี',
        reports: 'รายงาน',
        team: 'ทีม',
        dashboard: 'แดชบอร์ด',
        searchCustomers: 'ค้นหาลูกค้า...',
        searchDocuments: 'ค้นหาเอกสาร...',
        businessLabel: 'ธุรกิจ',
        noBusiness: 'ยังไม่เลือกธุรกิจ',
        signOut: 'ออกจากระบบ',
        welcomeBack: 'ยินดีต้อนรับกลับมา',
        lineAccount: 'LINE OA',
        notifications: 'การแจ้งเตือน',
        markAllRead: 'อ่านทั้งหมด',
        emptyNotifications: 'ยังไม่มีการแจ้งเตือนในตอนนี้',
        heroChip: 'EzBOQ Documents',
        heroTitleMain: 'โมดูลเอกสาร',
        heroTitleSub: 'ของคุณ',
        heroSubtitle: 'ดูสถานะเอกสาร อัปเดตข้อมูลธุรกิจ และจัดการลูกค้าได้จากชุดงานเดียวกับ EzBOQ',
        heroStep: 'เริ่มต้นใน 3 ขั้น',
        heroFast: 'เอกสารออกไว',
        heroRealtime: 'ติดตามได้เรียลไทม์',
        heroHelp: 'ต้องการความช่วยเหลือ? ใช้ปุ่มมุมขวาล่างได้ทันที',
        mainMenu: 'เพิ่มเติม',
        quotation: 'ใบเสนอราคา',
        billing: 'ใบวางบิล',
        receipt: 'ใบเสร็จ',
        helpTitle: 'ต้องการความช่วยเหลือ?',
        helpDesc: 'ติดปัญหาการใช้งาน สอบถามได้เลยครับ',
        contactAdmin: 'ติดต่อแอดมิน',
    };
    const themeLabel = !mounted ? copy.themeSystem : theme === 'dark' ? copy.themeDark : theme === 'light' ? copy.themeLight : copy.themeSystem;
    const unreadCount = notificationItems.filter((n) => !n.read).length;
    const devBypass =
        isRuntimeDevBypassEnabled() ||
        (process.env.NODE_ENV !== 'production' &&
            process.env.NEXT_PUBLIC_DEV_LOGIN === '1');

    const navigation = [
        { name: copy.home, href: '/dashboard', icon: Home, exact: true },
        { name: copy.profile, href: '/dashboard/profile', icon: Settings },
        { name: copy.customers, href: '/dashboard/customers', icon: Users },
        { name: copy.documents, href: '/dashboard/documents', icon: FileText },
        { name: copy.expenses, href: '/dashboard/expenses', icon: Wallet },
        { name: copy.subscription, href: '/dashboard/subscription', icon: BadgePercent },
        { name: copy.tax, href: '/dashboard/tax', icon: Percent },
        { name: copy.reports, href: '/dashboard/reports', icon: BarChart3 },
        { name: copy.team, href: '/dashboard/team', icon: Users2 },
    ];

    const isNavActive = (item: typeof navigation[number]) =>
        item.exact ? pathname === item.href : pathname.startsWith(item.href);

    const currentTitle =
        navigation.find((item) => isNavActive(item))?.name ??
        copy.dashboard;
    const isDocumentsPage = pathname.startsWith('/dashboard/documents');
    const isCustomersPage = pathname.startsWith('/dashboard/customers');
    const isSearchable = isDocumentsPage || isCustomersPage;
    const searchParamValue = searchParams.get('q') ?? '';
    const searchParamsString = searchParams.toString();
    const searchPlaceholder = isCustomersPage
        ? copy.searchCustomers
        : copy.searchDocuments;

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.lang = uiLang;
    }, [uiLang]);

    const hasRecentManualLogout = () => {
        if (typeof window === 'undefined') return false;
        const raw = window.sessionStorage.getItem('ezdoc-manual-logout-at');
        const loggedOutAt = raw ? Number(raw) : 0;
        if (!loggedOutAt || Number.isNaN(loggedOutAt)) return false;
        const isRecent = Date.now() - loggedOutAt < 15_000;
        if (!isRecent) {
            window.sessionStorage.removeItem('ezdoc-manual-logout-at');
        }
        return isRecent;
    };

    // Protected route check — wait until session bootstrap is finished
    useEffect(() => {
        if (devBypass || !sessionReady || user) return;
        if (hasRecentManualLogout()) {
            window.location.replace('/');
            return;
        }
        const params = new URLSearchParams(searchParams.toString());
        const currentPath = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        const redirectUrl = `/liff/link?redirect=${encodeURIComponent(currentPath)}`;
        window.location.replace(redirectUrl);
    }, [user, sessionReady, devBypass, pathname, searchParams]);

    useEffect(() => {
        if (!isNotificationsOpen) return;
        const handleClick = (event: MouseEvent) => {
            if (!notificationsRef.current) return;
            if (!notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isNotificationsOpen]);

    const helperPersonaTips = uiLang === 'en' ? {
        devboy: [
            'Getting started is simple.\nConnect LINE OA and try asking for your latest documents first.',
            'Want to see the core workflow?\nCreate one quotation, then open it on the web and the rest will make sense fast.',
            'Need a quick number check?\nAsk for this month\'s report in LINE and compare it here.',
        ],
        dokdok: [
            'Your PDF is ready.\nYou can send it to the customer right away from EzDOC.',
            'Need to know what happened to a document?\nDraft / issued / paid status is all visible here.',
            'If the customer asks again,\nopen the same PDF link instead of recreating the file.',
        ],
        freelance: [
            'You can write naturally.\nExample: quotation for Blue Whale, add 2 items at 1,500 each.',
            'If you are unsure where to start,\nopen the menu and use one of the examples first.',
            'It does not need to be perfect.\nTalk to EzDOC like chat and let it structure the document.',
        ],
        kid: [
            'Short messages are enough.\nEzDOC will clean up the format for you.',
            'Want something fast?\nTry latest customer or latest document first.',
            'The full workflow takes under a minute once LINE is connected.',
        ],
        duo: [
            'Working with a team?\nShare document links instead of sending screenshots around.',
            'After issuing a document,\ntrack the status on the web without asking each other.',
            'Need the overall view?\nCheck the live monthly summary here.',
        ],
    } : {
        devboy: [
            'เริ่มไม่ยากเลยนะ 😊\nแค่เชื่อม LINE OA แล้วลองพิมพ์คำว่า เอกสารล่าสุด ดูก่อนก็ได้',
            'อยากรู้ว่าระบบทำอะไรได้บ้าง\nลองออกใบเสนอราคาสักใบ แล้วมาเปิดดูในเว็บ เดี๋ยวเข้าใจเองเลย',
            'ถ้าอยากเช็คยอดแบบไว ๆ\nพิมพ์ว่า รายงาน เดือนนี้ ได้เลย ไม่ต้องกดหาหลายหน้า',
        ],
        dokdok: [
            'PDF พร้อมแล้วนะครับ 😊\nจะส่งให้ลูกค้า พิมพ์ว่า ส่งเอกสารให้ลูกค้า ได้เลย',
            'เอกสารตอนนี้ไปถึงไหนแล้ว เดี๋ยวผมเช็คให้เอง\nมีทั้ง ร่าง / ออกแล้ว / ชำระแล้ว เลยครับ',
            'ถ้าลูกค้าขอเอกสารซ้ำ\nดาวน์โหลดแล้วแชร์ลิงก์ให้เขาได้ทันที ไม่ต้องทำใหม่',
        ],
        freelance: [
            'ลองพิมพ์แบบนี้ดูนะคะคนเก่ง 😊\nใบเสนอราคา ลูกค้า คุณปลาวาฬ\nเพิ่มรายการ ปลาดาว 2 ตัว ราคา 1,500',
            'ถ้าไม่แน่ใจว่าจะเริ่มยังไง\nพิมพ์ว่า เมนู ได้นะ เดี๋ยวมีตัวอย่างให้เลือกเลย',
            'ไม่ต้องพิมพ์ให้เป๊ะก็ได้\nแค่เล่าให้ฟังเหมือนคุยแชท ระบบจะช่วยจัดให้ครบเองค่ะ ✨',
        ],
        kid: [
            'พิมพ์สั้น ๆ ก็พอ เดี๋ยวผมจัดรูปแบบให้เอง 😆',
            'อยากดูอะไรเร็ว ๆ\nลองพิมพ์ว่า ลูกค้าล่าสุด หรือ เอกสารล่าสุด ได้เลย',
            'เริ่มใช้งานจริง ๆ ใช้เวลาไม่ถึงนาที\nแอด LINE แล้วพิมพ์ได้ทันทีเลย',
        ],
        duo: [
            'ถ้าทำงานหลายคน\nแชร์ลิงก์เอกสารให้เพื่อนร่วมงานดูได้เลย',
            'ออกเอกสารเสร็จแล้ว\nไปตามต่อในเว็บ ดูสถานะได้ตลอด ไม่ต้องถามกันไปมา',
            'อยากดูภาพรวมทั้งทีม\nเช็คยอดรายเดือนแบบเรียลไทม์ได้เลยครับ',
        ],
    };

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

    const heroMalePoses = [
        'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_devboy_handsup_pose.png?alt=media&token=2d9a1579-8b83-4f3b-a7f0-ff760e5e4426',
        'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_devboy_lazy_coding_laptop.png?alt=media&token=4504eedd-1a50-407a-b0f4-967ae84c926d',
        'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_devboy_scroll_dokdok_support.png?alt=media&token=71b7fffc-d100-453e-bd35-bb2ffed02499',
    ];

    const heroFemalePoses = [
        'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_freelancegirl_heart_wink.png?alt=media&token=e76852ba-01ee-450d-bb60-4c5a905ff8d1',
        'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_freelancegirl_shy_nervous.png?alt=media&token=d01dedd9-8821-4cec-bbed-d051330fb901',
        'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FMascot%20V.2%20png%2Fezdoc_freelancegirl_cry_overwhelmed.png?alt=media&token=0fdab7ae-b765-4414-8b46-8abfb7fce6cb',
    ];
    const [helperTipIndex, setHelperTipIndex] = useState(0);
    const [helperMascotIndex, setHelperMascotIndex] = useState(() =>
        Math.floor(Math.random() * helperMascots.length)
    );

    const currentMascot = helperMascots[helperMascotIndex % helperMascots.length];
    const currentTips =
        helperPersonaTips[currentMascot?.persona as keyof typeof helperPersonaTips] ||
        helperPersonaTips.devboy;

    useEffect(() => {
        const timer = window.setInterval(() => {
            setHelperTipIndex((prev) => (prev + 1) % currentTips.length);
        }, 5500);
        return () => window.clearInterval(timer);
    }, [currentTips.length]);

    useEffect(() => {
        const handleClick = () => {
            setHelperMascotIndex((prev) => (prev + 1) % helperMascots.length);
            setHelperTipIndex(0);
        };
        window.addEventListener('pointerdown', handleClick);
        return () => window.removeEventListener('pointerdown', handleClick);
    }, [helperMascots.length]);

    useEffect(() => {
        const maxPoses = Math.max(heroMalePoses.length, heroFemalePoses.length);
        const timer = window.setInterval(() => {
            setHeroPoseIndex((prev) => (prev + 1) % maxPoses);
        }, 5200);
        return () => window.clearInterval(timer);
    }, [heroMalePoses.length, heroFemalePoses.length]);

    if (!sessionReady && !devBypass) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!user && !devBypass) return null;

    const handleSignOut = async () => {
        await signOut();
        window.location.replace('/');
    };

    const businessName = profile?.business?.name || copy.noBusiness;
    const userName =
        user?.displayName ||
        profile?.email?.split('@')[0] ||
        'EzBOQ User';
    const userEmail = user?.email || profile?.email || 'no-email@ezdoc.com';
    const logoIcon =
        'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Flogo%20icon.png?alt=media&token=033785a0-0a9c-40d0-8acb-fa406803600d';
    const lineOaLogo =
        'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FPreview%2Fmascot%20png%20notex%2FService%20Logo-02___4.png?alt=media&token=43d26c72-a711-46bf-bdf2-218526ff1eba';

    return (
        <div className="relative min-h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 animate-fadeIn">
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute -top-44 -right-40 h-96 w-96 rounded-full bg-slate-200/40 blur-[120px] animate-pulse" />
                <div className="absolute -bottom-44 -left-40 h-96 w-96 rounded-full bg-slate-100/60 blur-[140px] animate-pulse delay-1000" />
            </div>

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out lg:translate-x-0
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="absolute inset-0 bg-white/85 dark:bg-slate-900/90 shadow-2xl shadow-slate-200/60 dark:shadow-black/30 backdrop-blur-2xl" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/60 dark:from-slate-900/60 via-transparent to-white/60 dark:to-slate-900/60" />

                <div className="relative flex h-full flex-col">
                    <div className="flex h-20 items-center justify-between px-6 border-b border-emerald-100/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 blur-md opacity-40" />
                                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg overflow-hidden">
                                    <img src={logoIcon} alt="EzBOQ Documents" className="h-10 w-10 object-contain" />
                                </div>
                            </div>
                            <div>
                                <h1 className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-xl font-black tracking-tight text-transparent">
                                    EzBOQ
                                </h1>
                                <p className="text-xs font-medium text-slate-500">Documents</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="rounded-xl p-2 transition hover:bg-rose-50 lg:hidden"
                        >
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="mx-4 mt-6 mb-4">
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 p-4 shadow-lg shadow-slate-200/60 dark:shadow-black/20 backdrop-blur">
                            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-200/50 blur-2xl opacity-70" />
                            <div className="relative flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-700 shadow-sm ring-2 ring-emerald-200/50 dark:ring-emerald-700/50">
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {businessName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{copy.businessLabel}</p>
                                    <p className="truncate font-bold text-slate-900 dark:text-slate-100">{businessName}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
                        {navigation.map((item, index) => {
                            const isActive = isNavActive(item);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`
                                        group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300
                                        ${isActive
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/40'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'}
                                    `}
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                    )}
                                    <span
                                        className={`
                                            relative rounded-lg p-1.5 transition-all duration-300
                                            ${isActive ? 'bg-white/20' : 'bg-emerald-100/80 dark:bg-emerald-900/40 group-hover:bg-emerald-200/80 dark:group-hover:bg-emerald-800/60'}
                                        `}
                                    >
                                        <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} strokeWidth={2.5} />
                                    </span>
                                    <span className="relative">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="border-t border-emerald-100/50 dark:border-slate-700/50 p-4">
                        <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 shadow-lg shadow-slate-200/60 dark:shadow-black/20 backdrop-blur">
                            <div className="flex items-center gap-3 p-3">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 blur-sm opacity-50" />
                                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold">
                                        {userName.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-slate-900 dark:text-slate-100">{userName}</p>
                                    <p className="truncate text-xs text-slate-500">{userEmail}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={cycleTheme}
                            className="group mb-2 flex w-full items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-500/10"
                        >
                            <span className="rounded-lg bg-slate-100 dark:bg-slate-700 p-1.5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50">
                                <ThemeIcon className="h-4 w-4 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                            </span>
                            {copy.themePrefix}: {themeLabel}
                        </button>
                        <button
                            onClick={handleSignOut}
                            className="group flex w-full items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/50 dark:to-red-950/50 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400 transition-all duration-300 hover:border-rose-300 dark:hover:border-rose-600 hover:shadow-lg hover:shadow-rose-500/20"
                        >
                            <span className="rounded-lg bg-rose-100 dark:bg-rose-900/50 p-1.5 group-hover:bg-rose-200 dark:group-hover:bg-rose-800/50">
                                <LogOut className="h-4 w-4" />
                            </span>
                            {copy.signOut}
                        </button>
                    </div>
                </div>
            </aside>

            <div className="lg:pl-72">
                <header className="sticky top-0 z-30 backdrop-blur-xl">
                    <div className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 shadow-sm dark:shadow-slate-800/50" />
                    <div className="relative flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="group rounded-xl p-2 transition hover:bg-emerald-50 active:scale-95 lg:hidden"
                        >
                            <Menu className="h-6 w-6 text-slate-600 group-hover:text-emerald-600" strokeWidth={2.5} />
                        </button>

                        <div className="hidden lg:block">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currentTitle}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.welcomeBack}, {userName.split(' ')[0]} 👋</p>
                        </div>

                        <div className="flex-1 lg:hidden">
                            <h2 className="ml-3 font-bold text-slate-900 dark:text-slate-100">{currentTitle}</h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href="https://line.me/R/ti/p/@ezdoc"
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center gap-2 rounded-xl bg-[#00B900] px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition hover:bg-[#00a000]"
                            >
                                <img src={lineOaLogo} alt="LINE OA" className="h-5 w-auto brightness-0 invert" />
                                <span className="hidden sm:inline">{copy.lineAccount}</span>
                            </a>
                            {isSearchable && (
                                <DashboardSearchForm
                                    key={`${pathname}:${searchParamValue}`}
                                    initialQuery={searchParamValue}
                                    pathname={pathname}
                                    searchParamsString={searchParamsString}
                                    searchPlaceholder={searchPlaceholder}
                                    clearLabel={copy.clearSearch}
                                />
                            )}
                            <div ref={notificationsRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsNotificationsOpen((open) => !open)}
                                    className="group relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 transition hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-500/10"
                                    aria-haspopup="menu"
                                    aria-expanded={isNotificationsOpen}
                                >
                                    <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-500 text-xs font-bold text-white shadow-lg">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                {isNotificationsOpen && (
                                    <div
                                        className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-800/95 shadow-2xl shadow-slate-200/60 dark:shadow-black/30 backdrop-blur"
                                        role="menu"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 px-4 py-3">
                                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.notifications}</span>
                                            {unreadCount > 0 && (
                                                <button onClick={handleMarkAllRead} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">{copy.markAllRead} ({unreadCount})</button>
                                            )}
                                        </div>
                                        {notificationItems.length === 0 ? (
                                            <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                                                {copy.emptyNotifications}
                                            </div>
                                        ) : (
                                            <div className="max-h-72 overflow-y-auto">
                                                {notificationItems.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="border-b border-slate-100 dark:border-slate-700/50 px-4 py-3 last:border-b-0"
                                                    >
                                                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{item.description}</div>
                                                        <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{item.time}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="relative p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">

                    <section className="hero-shell mb-6">
                        <div className="hero-card">
                            <div className="hero-surface">
                                <div className="hero-grid">
                                    <div className="hero-copy">
                                        <div className="hero-chip animate-pulse-slow">
                                            <span className="hero-chip-dot"></span>
                                            {copy.heroChip}
                                        </div>
                                        <h1 className="hero-title">
                                            <span className="hero-title-gradient">{copy.heroTitleMain}</span>
                                            <span className="hero-title-sub">{copy.heroTitleSub}</span>
                                        </h1>
                                        <p className="hero-subtitle">
                                            {copy.heroSubtitle}
                                        </p>
                                        <div className="hero-stats">
                                            <span className="hero-stat-item">
                                                <svg className="hero-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                                </svg>
                                                {copy.heroStep}
                                            </span>
                                            <span className="hero-stat-item">
                                                <svg className="hero-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                                                </svg>
                                                {copy.heroFast}
                                            </span>
                                            <span className="hero-stat-item">
                                                <svg className="hero-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <polyline points="12 6 12 12 16 14" />
                                                </svg>
                                                {copy.heroRealtime}
                                            </span>
                                        </div>
                                        <p className="hero-help">
                                            <span className="hero-help-icon">💬</span>
                                            {copy.heroHelp}
                                        </p>
                                    </div>
                                    <div className="hero-visual pointer-events-none">
                                        <div className="hero-orb hero-orb-1" />
                                        <div className="hero-orb hero-orb-2" />
                                        <div className="hero-orb hero-orb-3" />
                                        <div className="hero-frame">
                                            <img
                                                key={`hero-male-${heroPoseIndex}`}
                                                src={heroMalePoses[heroPoseIndex % heroMalePoses.length]}
                                                alt="EzDOC hero (Dev boy)"
                                                className="hero-float hero-img hero-img-main hero-pose transition-transform active:scale-95"
                                                loading="eager"
                                            />
                                            <img
                                                key={`hero-female-${heroPoseIndex}`}
                                                src={heroFemalePoses[heroPoseIndex % heroFemalePoses.length]}
                                                alt="EzDOC hero (Freelance girl)"
                                                className="hero-float-delayed hero-img hero-img-alt hero-pose transition-transform active:scale-95"
                                                loading="eager"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Tab Bar */}
            <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] lg:hidden">
                <div className="flex items-center justify-around px-2 py-1">
                    {[
                        { name: copy.home, href: '/dashboard', icon: Home, exact: true },
                        { name: copy.documents, href: '/dashboard/documents', icon: FileText },
                    ].map((tab) => {
                        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
                        const Icon = tab.icon;
                        return (
                            <Link key={tab.href} href={tab.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                                {tab.name}
                            </Link>
                        );
                    })}
                    {/* Center FAB */}
                    <div className="relative -mt-6">
                        <button
                            onClick={() => setIsMobileCreateOpen((v) => !v)}
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 transition active:scale-95"
                        >
                            <Plus className={`h-7 w-7 transition-transform ${isMobileCreateOpen ? 'rotate-45' : ''}`} />
                        </button>
                        {isMobileCreateOpen && (
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-44 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-xl">
                                {[
                                    { type: 'QUO', label: copy.quotation },
                                    { type: 'BILL', label: copy.billing },
                                    { type: 'RECEIPT', label: copy.receipt },
                                ].map(({ type, label }) => (
                                    <Link
                                        key={type}
                                        href={`/dashboard/documents/editor?type=${type}`}
                                        onClick={() => setIsMobileCreateOpen(false)}
                                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        <FileText className="h-4 w-4 text-emerald-500" />
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                    {[
                        { name: copy.customers, href: '/dashboard/customers', icon: Users },
                        { name: copy.mainMenu, href: '#more', icon: Menu, isMore: true },
                    ].map((tab) => {
                        if (tab.isMore) {
                            return (
                                <button key="more" onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 transition">
                                    <Menu className="h-5 w-5" strokeWidth={2} />
                                    {tab.name}
                                </button>
                            );
                        }
                        const active = pathname.startsWith(tab.href);
                        const Icon = tab.icon;
                        return (
                            <Link key={tab.href} href={tab.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                                {tab.name}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {showHelpCard && (
                <div className="fixed bottom-6 right-6 z-20 hidden lg:flex flex-col items-end">
                    <div className="relative mb-2 w-64 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-800/95 p-3 shadow-xl backdrop-blur animate-fadeIn">
                        <button
                            onClick={() => setShowHelpCard(false)}
                            className="absolute -top-2 -left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 shadow-sm transition"
                        >
                            <X className="h-3 w-3" />
                        </button>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-center">
                            {currentTips[helperTipIndex % currentTips.length]}
                        </div>
                        <div className="absolute -bottom-2 right-8 h-4 w-4 bg-white border-b border-r border-slate-200 transform rotate-45"></div>
                    </div>

                    <div className="relative w-64 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 p-4 shadow-2xl shadow-slate-200/60 dark:shadow-black/20 backdrop-blur">
                        <div className="absolute -top-16 right-2 w-28 h-28 pointer-events-none">
                            <img
                                key={helperMascotIndex}
                                src={currentMascot?.src}
                                alt="EzDOC Helper"
                                className="w-full h-full object-contain drop-shadow-lg helper-float"
                                loading="lazy"
                            />
                        </div>
                        <div className="pt-8">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{copy.helpTitle}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">{copy.helpDesc}</div>
                            <div className="grid grid-cols-2 gap-2">
                                <a
                                    href="https://line.me/R/ti/p/@ezdoc"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-1 rounded-xl bg-[#00B900] py-2 text-xs font-bold text-white shadow-lg shadow-green-500/20 transition hover:bg-[#00a000] hover:-translate-y-0.5"
                                >
                                    <img src={lineOaLogo} className="h-4 w-auto brightness-0 invert" alt="" />
                                    {copy.lineAccount}
                                </a>
                                <a
                                    href="mailto:admin@ezboq.com"
                                    className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-300 hover:bg-slate-50 hover:-translate-y-0.5"
                                >
                                    {copy.contactAdmin}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-fadeIn {
                    animation: fadeIn 0.4s ease-out both;
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                .helper-float {
                    animation: helperFloat 5.5s ease-in-out infinite;
                }
                .helper-mascot {
                    transition: transform 0.35s ease, opacity 0.35s ease;
                }
                .helper-card {
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid rgba(226, 232, 240, 0.9);
                    border-radius: 18px;
                    padding: 12px 14px;
                    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
                    backdrop-filter: blur(8px);
                    line-height: 1.5;
                }
                .helper-card-text {
                    white-space: pre-line;
                    display: block;
                    transform: translateY(-4px);
                }
                .hero-shell {
                    position: relative;
                }
                .hero-card {
                    border-radius: 28px;
                    padding: 1px;
                    background: linear-gradient(120deg, rgba(16,185,129,0.25), rgba(59,130,246,0.2), rgba(14,165,233,0.2));
                    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.08);
                }
                .hero-surface {
                    border-radius: 27px;
                    background: linear-gradient(140deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8));
                    border: 1px solid rgba(226, 232, 240, 0.9);
                }
                :is(.dark) .hero-surface {
                    background: linear-gradient(140deg, rgba(30,41,59,0.95), rgba(15,23,42,0.8));
                    border-color: rgba(51,65,85,0.9);
                    backdrop-filter: blur(16px);
                    overflow: visible;
                    position: relative;
                }
                .hero-surface::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at top left, rgba(16,185,129,0.1), transparent 50%),
                                radial-gradient(circle at bottom right, rgba(59,130,246,0.08), transparent 50%);
                    pointer-events: none;
                }
                .hero-grid {
                    display: grid;
                    gap: 24px;
                    padding: 32px;
                    position: relative;
                }
                .hero-copy {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: relative;
                    z-index: 1;
                }
                .hero-chip {
                    align-self: flex-start;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: #0f766e;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(20, 184, 166, 0.12));
                    border: 1px solid rgba(16, 185, 129, 0.25);
                    padding: 8px 16px;
                    border-radius: 999px;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
                }
                .hero-chip-dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    animation: pulse-dot 2s infinite;
                }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                }
                .animate-pulse-slow {
                    animation: pulse-glow 3s infinite;
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15); }
                    50% { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3); }
                }
                .hero-title {
                    font-size: 32px;
                    font-weight: 800;
                    line-height: 1.2;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .hero-title-gradient {
                    background: linear-gradient(135deg, #0f766e 0%, #10b981 50%, #14b8a6 100%);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                }
                .hero-title-sub {
                    color: #0f172a;
                }
                :is(.dark) .hero-title-sub {
                    color: #e2e8f0;
                }
                .hero-subtitle {
                    font-size: 15px;
                    color: #475569;
                    line-height: 1.6;
                }
                :is(.dark) .hero-subtitle {
                    color: #94a3b8;
                }
                .hero-stats {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    font-size: 12px;
                    color: #0f766e;
                }
                .hero-stat-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: linear-gradient(135deg, rgba(15, 118, 110, 0.1), rgba(16, 185, 129, 0.08));
                    border: 1px solid rgba(15, 118, 110, 0.15);
                    padding: 8px 12px;
                    border-radius: 999px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                .hero-stat-item:hover {
                    background: linear-gradient(135deg, rgba(15, 118, 110, 0.15), rgba(16, 185, 129, 0.12));
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                }
                .hero-stat-icon {
                    width: 14px;
                    height: 14px;
                    flex-shrink: 0;
                }
                .hero-help {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: #64748b;
                }
                .hero-help-icon {
                    font-size: 14px;
                }
                .hero-visual {
                    position: relative;
                    height: 340px;
                    min-height: 340px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 3;
                }
                .hero-orb {
                    position: absolute;
                    border-radius: 999px;
                    filter: blur(40px);
                    opacity: 0.7;
                }
                .hero-orb-1 {
                    width: 200px;
                    height: 200px;
                    background: rgba(16, 185, 129, 0.25);
                    top: -20px;
                    right: -10px;
                }
                .hero-orb-2 {
                    width: 220px;
                    height: 220px;
                    background: rgba(14, 165, 233, 0.25);
                    bottom: -40px;
                    left: -20px;
                }
                .hero-orb-3 {
                    width: 150px;
                    height: 150px;
                    background: rgba(139, 92, 246, 0.2);
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                .hero-frame {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 0 4%;
                    z-index: 3;
                    overflow: visible;
                    pointer-events: auto;
                }
                .hero-img {
                    position: relative;
                    object-fit: contain;
                    max-height: 100%;
                    filter: drop-shadow(0 24px 45px rgba(15, 23, 42, 0.18));
                    z-index: 3;
                    transition: opacity 0.35s ease, transform 0.35s ease;
                    will-change: transform, opacity;
                }
                .hero-img-main {
                    width: min(380px, 48%);
                }
                .hero-img-alt {
                    width: min(380px, 48%);
                }
                .hero-pose {
                    animation: poseFade 0.6s ease;
                }
                .hero-img-single {
                    height: auto;
                    width: 100%;
                    max-width: 320px;
                    filter: drop-shadow(0 20px 40px rgba(15, 23, 42, 0.2));
                }
                .hero-float {
                    animation: heroFloat 6s ease-in-out infinite;
                }
                .hero-float-delayed {
                    animation: heroFloat 7s ease-in-out infinite;
                    animation-delay: 0.6s;
                }
                @keyframes poseFade {
                    0% { opacity: 0.8; transform: scale(0.92) translateY(10px); }
                    50% { opacity: 1; transform: scale(1.03) translateY(-3px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                @keyframes heroFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes helperFloat {
                    0%, 100% { transform: translateY(0) rotate(-1deg); }
                    50% { transform: translateY(-10px) rotate(1deg); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @media (min-width: 768px) {
                    .hero-grid {
                        grid-template-columns: 1.15fr 0.85fr;
                        align-items: center;
                        padding-right: 44%;
                    }
                    .hero-title {
                        font-size: 32px;
                    }
                    .hero-subtitle {
                        font-size: 15px;
                    }
                    .hero-visual {
                        position: absolute;
                        right: 0;
                        top: 0;
                        bottom: 0;
                        width: 44%;
                        min-height: 360px;
                        pointer-events: none;
                    }
                    .hero-frame {
                        pointer-events: auto;
                    }
                    .hero-img-main {
                        width: min(450px, 48%);
                    }
                    .hero-img-alt {
                        width: min(450px, 48%);
                    }
                    .hero-img-single {
                        max-width: 480px;
                        max-height: 420px;
                        width: auto;
                    }
                }
            `}</style>

            {/* Image Preloader */}
            <div className="hidden" aria-hidden="true">
                {[...heroMalePoses, ...heroFemalePoses, ...helperMascots.map(m => m.src)].map((src, i) => (
                    <img key={i} src={src} alt="" loading="eager" />
                ))}
            </div>
        </div>
    );
}

export default function DashboardLayout(props: { children: React.ReactNode }) {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
            }
        >
            <DashboardLayoutContent {...props} />
        </Suspense>
    );
}
