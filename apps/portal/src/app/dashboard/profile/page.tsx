/* eslint-disable @next/next/no-img-element */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { businessRepo } from '@/lib/repos/business.repo';
import { Business } from '@/lib/api';
import {
    User,
    Building2,
    Settings,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    Percent,
    Building,
    Loader2,
    Check,
    AlertCircle,
    Link as LinkIcon,
    Image as ImageIcon,
    UploadCloud,
    X,
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

type TabType = 'account' | 'business' | 'settings';
type UiLanguage = 'th' | 'en';
type ProfileFormData = Partial<Business> & { bankNameCustom?: string };
type SettingsState = {
    emailNotifications: boolean;
    lineNotifications: boolean;
    language: UiLanguage;
};

const OTHER_BANK_VALUE = 'อื่นๆ';
const BANK_CODE_BY_NAME: Record<string, string> = {
    'กสิกรไทย': 'KBANK',
    'ไทยพาณิชย์': 'SCB',
    'กรุงเทพ': 'BBL',
    'กรุงไทย': 'KTB',
    'กรุงศรีอยุธยา': 'BAY',
    'ทีเอ็มบีธนชาต': 'TTB',
    'ออมสิน': 'GSB',
    'อาคารสงเคราะห์': 'GHB',
    'ธ.ก.ส.': 'BAAC',
    'ซีไอเอ็มบี': 'CIMB',
    'ยูโอบี': 'UOB',
    'ทิสโก้': 'TISCO',
    'เกียรตินาคินภัทร': 'KKP',
    'อิสลามแห่งประเทศไทย': 'IBANK',
    'แลนด์ แอนด์ เฮ้าส์': 'LHB',
    'ไทยเครดิต': 'TCRB',
    'ไอซีบีซี': 'ICBC',
    'ซิตี้แบงก์': 'CITI',
    'เอชเอสบีซี': 'HSBC',
    'ธนชาต': 'THANACHART',
};

const PROFILE_COPY = {
    th: {
        uploadTooLarge: 'ขนาดไฟล์ต้องไม่เกิน 2MB',
        uploadFailed: 'อัปโหลดรูปภาพไม่สำเร็จ',
        saveSuccess: 'บันทึกข้อมูลสำเร็จ',
        genericError: 'เกิดข้อผิดพลาด',
        settingsSaved: 'บันทึกการตั้งค่าสำเร็จ',
        customBankRequired: 'กรุณาระบุชื่อธนาคารก่อนบันทึก',
        deleteIntro: 'การลบบัญชีจะลบการเชื่อมต่อ LINE และไม่สามารถย้อนกลับได้',
        deletePrompt: 'พิมพ์ DELETE เพื่อยืนยันการลบบัญชี',
        deletePromptFailed: 'ยกเลิกการลบบัญชี เพราะไม่ได้พิมพ์ DELETE',
        deletingAccount: 'กำลังลบบัญชี...',
        tabs: {
            account: 'บัญชีผู้ใช้',
            business: 'ข้อมูลธุรกิจ',
            settings: 'การตั้งค่า',
        },
        unnamedBusiness: 'ยังไม่ตั้งชื่อ',
        noEmail: 'ไม่มีอีเมล',
        verified: 'บัญชียืนยันแล้ว',
        businessReady: 'ธุรกิจพร้อมใช้งาน',
        accountSection: 'ข้อมูลบัญชีผู้ใช้',
        lineConnected: 'เชื่อมต่อแล้ว ✓',
        lineAccount: 'LINE Account',
        lineAccountDesc: 'เชื่อมต่อกับ LINE Official Account',
        accountCreated: 'สร้างบัญชีเมื่อ',
        saveButton: 'บันทึกข้อมูล',
        saving: 'กำลังบันทึก...',
        settingsTitle: 'การตั้งค่า',
        notificationTitle: 'การแจ้งเตือน',
        emailNotificationTitle: 'แจ้งเตือนทางอีเมล (ปิดชั่วคราว)',
        emailNotificationDesc: 'กำลังปิดใช้งานชั่วคราวก่อนเปิดระบบเต็มรูปแบบ',
        lineNotificationTitle: 'แจ้งเตือนทาง LINE',
        lineNotificationDesc: 'รับการแจ้งเตือนเกี่ยวกับเอกสารทาง LINE',
        languageTitle: 'ภาษา',
        dangerZone: 'พื้นที่อันตราย',
        deleteAccountTitle: 'ลบบัญชี',
        deleteAccountDesc: 'การลบบัญชีจะไม่สามารถกู้คืนได้',
        deleteAccountButton: 'ลบบัญชี',
        saveSettingsButton: 'บันทึกการตั้งค่า',
        businessSection: 'ข้อมูลธุรกิจ',
        businessName: 'ชื่อธุรกิจ',
        businessNamePlaceholder: 'บริษัท ABC จำกัด',
        address: 'ที่อยู่',
        addressPlaceholder: '123/45 ถ.สุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110',
        taxId: 'เลขประจำตัวผู้เสียภาษี',
        phone: 'เบอร์โทรศัพท์',
        businessEmail: 'อีเมลธุรกิจ',
        taxSettings: 'การตั้งค่าภาษี',
        vatEnabled: 'ภาษีมูลค่าเพิ่ม (VAT)',
        vatEnabledDesc: 'ใช้ VAT เป็นค่าเริ่มต้น',
        vatRate: 'อัตรา VAT (%)',
        vatType: 'ประเภท VAT',
        vatTypeExclusive: 'บวกเพิ่ม (Exclusive)',
        vatTypeInclusive: 'รวมอยู่แล้ว (Inclusive)',
        whtEnabled: 'หัก ณ ที่จ่าย (WHT)',
        whtEnabledDesc: 'ใช้ WHT เป็นค่าเริ่มต้น',
        whtRate: 'อัตรา WHT (%)',
        pdfDesign: 'การออกแบบ PDF',
        bankInfo: 'ข้อมูลธนาคาร',
        bankName: 'ชื่อธนาคาร',
        selectBank: 'เลือกธนาคาร',
        popularBanks: 'ธนาคารยอดนิยม',
        stateBanks: 'ธนาคารรัฐ',
        otherBanks: 'ธนาคารอื่นๆ',
        customBank: 'อื่นๆ (พิมพ์เอง)',
        customBankPlaceholder: 'พิมพ์ชื่อธนาคาร',
        bankAccountNo: 'เลขบัญชี',
        bankAccountName: 'ชื่อบัญชี',
        bankAccountNamePlaceholder: 'บริษัท ABC จำกัด',
        promptpayAccount: 'PromptPay / เบอร์มือถือ',
        promptpayAccountPlaceholder: 'เบอร์มือถือ/เลขบัตรประชาชน',
        promptpayName: 'ชื่อบัญชี PromptPay',
        promptpayNamePlaceholder: 'ชื่อบัญชี (ถ้ามี)',
        knownBankOnlyHint: 'โลโก้ธนาคารใน PDF จะขึ้นอัตโนมัติเมื่อเลือกธนาคารจากรายการที่รองรับ',
    },
    en: {
        uploadTooLarge: 'File size must not exceed 2MB',
        uploadFailed: 'Image upload failed',
        saveSuccess: 'Saved successfully',
        genericError: 'Something went wrong',
        settingsSaved: 'Settings saved successfully',
        customBankRequired: 'Please enter a bank name before saving',
        deleteIntro: 'Deleting this account will unlink LINE and cannot be undone',
        deletePrompt: 'Type DELETE to confirm account deletion',
        deletePromptFailed: 'Account deletion cancelled because DELETE was not entered',
        deletingAccount: 'Deleting account...',
        tabs: {
            account: 'Account',
            business: 'Business',
            settings: 'Settings',
        },
        unnamedBusiness: 'Unnamed business',
        noEmail: 'No email',
        verified: 'Verified account',
        businessReady: 'Business ready',
        accountSection: 'Account information',
        lineConnected: 'Connected ✓',
        lineAccount: 'LINE Account',
        lineAccountDesc: 'Connected to LINE Official Account',
        accountCreated: 'Account created',
        saveButton: 'Save changes',
        saving: 'Saving...',
        settingsTitle: 'Settings',
        notificationTitle: 'Notifications',
        emailNotificationTitle: 'Email notifications (temporarily disabled)',
        emailNotificationDesc: 'Temporarily disabled before full rollout',
        lineNotificationTitle: 'LINE notifications',
        lineNotificationDesc: 'Receive document updates by LINE',
        languageTitle: 'Language',
        dangerZone: 'Danger zone',
        deleteAccountTitle: 'Delete account',
        deleteAccountDesc: 'This action cannot be undone',
        deleteAccountButton: 'Delete account',
        saveSettingsButton: 'Save settings',
        businessSection: 'Business information',
        businessName: 'Business name',
        businessNamePlaceholder: 'ABC Company Ltd.',
        address: 'Address',
        addressPlaceholder: '123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
        taxId: 'Tax ID',
        phone: 'Phone number',
        businessEmail: 'Business email',
        taxSettings: 'Tax settings',
        vatEnabled: 'VAT',
        vatEnabledDesc: 'Use VAT by default',
        vatRate: 'VAT rate (%)',
        vatType: 'VAT type',
        vatTypeExclusive: 'Add-on (Exclusive)',
        vatTypeInclusive: 'Included (Inclusive)',
        whtEnabled: 'Withholding tax (WHT)',
        whtEnabledDesc: 'Use WHT by default',
        whtRate: 'WHT rate (%)',
        pdfDesign: 'PDF design',
        bankInfo: 'Bank details',
        bankName: 'Bank',
        selectBank: 'Select bank',
        popularBanks: 'Popular banks',
        stateBanks: 'State banks',
        otherBanks: 'Other banks',
        customBank: 'Other (type manually)',
        customBankPlaceholder: 'Type bank name',
        bankAccountNo: 'Bank account number',
        bankAccountName: 'Bank account name',
        bankAccountNamePlaceholder: 'ABC Company Ltd.',
        promptpayAccount: 'PromptPay / mobile number',
        promptpayAccountPlaceholder: 'Mobile number / citizen ID',
        promptpayName: 'PromptPay account name',
        promptpayNamePlaceholder: 'Account name (optional)',
        knownBankOnlyHint: 'PDF bank logos are shown automatically when the selected bank is supported',
    },
} as const;

const PDF_THEME_OPTIONS = [
    {
        value: 'green',
        label: 'Executive Canvas',
        thai: 'เขียว',
        description: 'หัวเอกสารคม โปร่ง อ่านง่าย เหมาะกับใบเสนอราคาและเอกสารองค์กร',
        swatch: 'from-emerald-500 via-teal-500 to-green-700',
        ring: 'ring-emerald-100',
    },
    {
        value: 'blue',
        label: 'Modern Commerce',
        thai: 'น้ำเงิน',
        description: 'โทนธุรกิจร่วมสมัย เน้นตัวเลข ยอดรวม และ payment block ชัดเจน',
        swatch: 'from-blue-500 via-cyan-500 to-indigo-700',
        ring: 'ring-blue-100',
    },
    {
        value: 'red',
        label: 'Luxury Atelier',
        thai: 'แดง',
        description: 'กลิ่นพรีเมียม เหมาะกับแบรนด์บริการ งานดีไซน์ และเอกสารที่ต้องการภาพลักษณ์เด่น',
        swatch: 'from-rose-500 via-amber-400 to-red-800',
        ring: 'ring-rose-100',
    },
    {
        value: 'mono',
        label: 'Legal Minimal',
        thai: 'ขาวดำ',
        description: 'เรียบ สุภาพ และพร้อมพิมพ์ เหมาะกับเอกสารทางการหรือใช้งานสแกนถ่ายสำเนา',
        swatch: 'from-slate-800 via-slate-500 to-zinc-300',
        ring: 'ring-slate-200',
    },
] as const;

export default function ProfilePage() {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('account');
    const [formData, setFormData] = useState<ProfileFormData>({});
    const [loading, setLoading] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Settings state
    const [settings, setSettings] = useState<SettingsState>({
        emailNotifications: false,
        lineNotifications: true,
        language: 'th',
    });
    const uiLang: UiLanguage = settings.language === 'en' ? 'en' : 'th';
    const copy = PROFILE_COPY[uiLang];

    useEffect(() => {
        if (profile?.business) {
            const rawBankName = profile.business.bankName || '';
            const knownBank = Boolean(rawBankName && BANK_CODE_BY_NAME[rawBankName]);
            setFormData({
                ...profile.business,
                bankName: rawBankName ? (knownBank ? rawBankName : OTHER_BANK_VALUE) : '',
                bankNameCustom: rawBankName && !knownBank ? rawBankName : '',
            });
            setSettings({
                emailNotifications: profile.business.emailNotifications === true,
                lineNotifications: profile.business.lineNotifications !== false,
                language: profile.business.language === 'en' ? 'en' : 'th',
            });
        }
    }, [profile]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.lang = uiLang;
    }, [uiLang]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const [uploading, setUploading] = useState<Record<string, boolean>>({});

    const handleSettingsChange = (key: string, value: boolean | string) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof Business) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.business?.id || !user?.uid) return;

        // Validating file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: copy.uploadTooLarge });
            return;
        }

        setUploading((prev) => ({ ...prev, [key]: true }));
        try {
            // Path: users/{userId}/businesses/{businessId}/assets/{key}_{timestamp}.{ext}
            const ext = file.name.split('.').pop() || 'png';
            const storageRef = ref(storage, `users/${user.uid}/businesses/${profile.business.id}/assets/${key}_${Date.now()}.${ext}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            setFormData((prev) => ({
                ...prev,
                [key]: url,
            }));

            // Auto-save just the image field? Or wait for Submit?
            // Users prefer immediate feedback on upload, but let's keep it in formData until "Verify/Save" or just let Submit handle it.
            // Better to let "Submit" handle the DB update, but we update form state here.
        } catch (error) {
            console.error('Upload failed:', error);
            setMessage({ type: 'error', text: copy.uploadFailed });
        } finally {
            setUploading((prev) => ({ ...prev, [key]: false }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.business?.id) return;

        setLoading(true);
        setMessage(null);

        try {
            const resolvedBankName =
                formData.bankName === OTHER_BANK_VALUE
                    ? String(formData.bankNameCustom || '').trim()
                    : String(formData.bankName || '').trim();

            if (formData.bankName === OTHER_BANK_VALUE && !resolvedBankName) {
                setMessage({ type: 'error', text: copy.customBankRequired });
                return;
            }

            const payload: Partial<Business> = {
                ...formData,
                bankName: resolvedBankName || '',
                bankCode: resolvedBankName ? (BANK_CODE_BY_NAME[resolvedBankName] || '') : '',
            };
            delete (payload as ProfileFormData).bankNameCustom;

            await businessRepo.updateBusiness(profile.business.id, payload);
            await refreshProfile();
            setMessage({ type: 'success', text: copy.saveSuccess });
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : copy.genericError });
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'account', name: copy.tabs.account, icon: User },
        { id: 'business', name: copy.tabs.business, icon: Building2 },
        { id: 'settings', name: copy.tabs.settings, icon: Settings },
    ];

    const handleSaveSettings = async () => {
        if (!profile?.business?.id) return;

        setSettingsLoading(true);
        setMessage(null);

        try {
            await businessRepo.updateBusiness(profile.business.id, {
                emailNotifications: settings.emailNotifications,
                lineNotifications: settings.lineNotifications,
                language: settings.language,
            });
            await refreshProfile();
            setMessage({ type: 'success', text: copy.settingsSaved });
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : copy.genericError });
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (typeof window === 'undefined') return;
        const acknowledged = window.confirm(copy.deleteIntro);
        if (!acknowledged) return;

        const confirmation = window.prompt(copy.deletePrompt);
        if ((confirmation || '').trim().toUpperCase() !== 'DELETE') {
            setMessage({ type: 'error', text: copy.deletePromptFailed });
            return;
        }

        setDeletingAccount(true);
        setMessage(null);

        try {
            await businessRepo.deleteAccount('DELETE');
            await signOut();
            window.location.replace('/');
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : copy.genericError });
        } finally {
            setDeletingAccount(false);
        }
    };

    if (!profile) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            {/* Profile Header */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-8 text-white shadow-lg shadow-emerald-500/20">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                    {/* Avatar */}
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-4xl font-bold backdrop-blur-sm">
                        {profile.business?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>

                    {/* User Info */}
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl font-bold">{profile.business?.name || copy.unnamedBusiness}</h1>
                        <p className="mt-1 text-white/80">{user?.email || copy.noEmail}</p>
                        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                                <Check className="h-3 w-3" />
                                {copy.verified}
                            </span>
                            {profile.activeBusinessId && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/30 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                                    <Building2 className="h-3 w-3" />
                                    {copy.businessReady}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`
                                flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors
                                ${activeTab === tab.id
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-slate-200'
                                }
                            `}
                        >
                            <tab.icon className="h-5 w-5" />
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-gray-100 dark:ring-slate-700">
                {/* Account Tab */}
                {activeTab === 'account' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{copy.accountSection}</h2>

                        <div className="grid gap-6 sm:grid-cols-2">
                            {/* Email */}
                            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                                        <Mail className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">อีเมล</p>
                                        <p className="font-medium text-gray-900 dark:text-slate-100">{user?.email || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* User ID */}
                            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                                        <User className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">User ID</p>
                                        <p className="truncate font-mono text-sm text-gray-900 dark:text-slate-100">{user?.uid?.slice(0, 16)}...</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LINE Connection Status */}
                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                                        <LinkIcon className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-slate-100">{copy.lineAccount}</p>
                                        <p className="text-sm text-gray-500 dark:text-slate-400">{copy.lineAccountDesc}</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                    {copy.lineConnected}
                                </span>
                            </div>
                        </div>

                        {/* Account Created */}
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                            <p>{copy.accountCreated}: {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString(uiLang === 'en' ? 'en-US' : 'th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</p>
                        </div>
                    </div>
                )}

                {/* Business Tab */}
                {activeTab === 'business' && (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Business Identity */}
                        <div>
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                                <Building2 className="h-5 w-5 text-emerald-600" />
                                {copy.businessSection}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{copy.businessName}</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder={copy.businessNamePlaceholder}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                                        <MapPin className="mr-1 inline h-4 w-4" />
                                        {copy.address}
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder={copy.addressPlaceholder}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                                        <CreditCard className="mr-1 inline h-4 w-4" />
                                        {copy.taxId}
                                    </label>
                                    <input
                                        type="text"
                                        name="taxId"
                                        value={formData.taxId || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder="0123456789012"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                                        <Phone className="mr-1 inline h-4 w-4" />
                                        {copy.phone}
                                    </label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder="02-xxx-xxxx"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                                        <Mail className="mr-1 inline h-4 w-4" />
                                        {copy.businessEmail}
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder="contact@company.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tax Settings */}
                        <div className="border-t dark:border-slate-700 pt-8">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                                <Percent className="h-5 w-5 text-emerald-600" />
                                {copy.taxSettings}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-slate-100">{copy.vatEnabled}</p>
                                        <p className="text-sm text-gray-500 dark:text-slate-400">{copy.vatEnabledDesc}</p>
                                    </div>
                                    <label className="relative inline-flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            name="defaultVatEnabled"
                                            checked={formData.defaultVatEnabled || false}
                                            onChange={handleChange}
                                            className="peer sr-only"
                                        />
                                        <div className="peer h-6 w-11 rounded-full bg-gray-200 dark:bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 dark:after:border-slate-500 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300"></div>
                                    </label>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{copy.vatRate}</label>
                                    <input
                                        type="number"
                                        name="defaultVatRate"
                                        value={formData.defaultVatRate || 7}
                                        onChange={handleChange}
                                        disabled={!formData.defaultVatEnabled}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{copy.vatType}</label>
                                    <select
                                        name="defaultVatType"
                                        value={formData.defaultVatType || 'exclusive'}
                                        onChange={handleChange}
                                        disabled={!formData.defaultVatEnabled}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500"
                                    >
                                        <option value="exclusive">{copy.vatTypeExclusive}</option>
                                        <option value="inclusive">{copy.vatTypeInclusive}</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-slate-100">{copy.whtEnabled}</p>
                                        <p className="text-sm text-gray-500 dark:text-slate-400">{copy.whtEnabledDesc}</p>
                                    </div>
                                    <label className="relative inline-flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            name="defaultWhtEnabled"
                                            checked={formData.defaultWhtEnabled || false}
                                            onChange={handleChange}
                                            className="peer sr-only"
                                        />
                                        <div className="peer h-6 w-11 rounded-full bg-gray-200 dark:bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 dark:after:border-slate-500 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300"></div>
                                    </label>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{copy.whtRate}</label>
                                    <input
                                        type="number"
                                        name="defaultWhtRate"
                                        value={formData.defaultWhtRate || 3}
                                        onChange={handleChange}
                                        disabled={!formData.defaultWhtEnabled}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* PDF Theme */}
                        <div className="border-t dark:border-slate-700 pt-8">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                                <Settings className="h-5 w-5 text-emerald-600" />
                                {copy.pdfDesign}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{uiLang === 'en' ? 'Default document theme' : 'ดีไซน์เอกสารเริ่มต้น'}</label>
                                    <select
                                        name="pdfTheme"
                                        value={formData.pdfTheme || 'green'}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    >
                                        {PDF_THEME_OPTIONS.map((theme) => (
                                            <option key={theme.value} value={theme.value}>
                                                {theme.label} ({theme.thai})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                                        {uiLang === 'en' ? 'This theme is applied to new PDFs unless a document-specific override is set.' : 'ดีไซน์นี้จะใช้กับ PDF ใหม่ทุกใบที่ระบบออกให้ ถ้าไม่ได้ override รายประเภทเอกสาร'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 p-4 text-xs text-emerald-700 dark:text-emerald-300">
                                    {uiLang === 'en' ? 'You can override themes per document type below, or keep the main theme for a consistent document family.' : 'เลือก family แยกตามประเภทเอกสารได้ด้านล่าง หรือปล่อยเป็น “ใช้ดีไซน์หลัก” เพื่อคุมโทนทั้งชุดให้เหมือนกัน'}
                                </div>
                                <div className="sm:col-span-2 grid gap-3 lg:grid-cols-4">
                                    {PDF_THEME_OPTIONS.map((theme) => (
                                        <div
                                            key={theme.value}
                                            className={`rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ${theme.ring} dark:ring-slate-700`}
                                        >
                                            <div className={`h-16 rounded-xl bg-gradient-to-r ${theme.swatch}`} />
                                            <div className="mt-3">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{theme.label}</p>
                                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{theme.thai}</p>
                                                <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-slate-300">{theme.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{uiLang === 'en' ? 'Quotation (QUO)' : 'ใบเสนอราคา (QUO)'}</label>
                                    <select
                                        name="pdfThemeQuo"
                                        value={formData.pdfThemeQuo || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    >
                                        <option value="">{uiLang === 'en' ? 'Use main theme' : 'ใช้ดีไซน์หลัก'}</option>
                                        {PDF_THEME_OPTIONS.map((theme) => (
                                            <option key={theme.value} value={theme.value}>
                                                {theme.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{uiLang === 'en' ? 'Billing Note (BILL)' : 'ใบวางบิล (BILL)'}</label>
                                    <select
                                        name="pdfThemeBill"
                                        value={formData.pdfThemeBill || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    >
                                        <option value="">{uiLang === 'en' ? 'Use main theme' : 'ใช้ดีไซน์หลัก'}</option>
                                        {PDF_THEME_OPTIONS.map((theme) => (
                                            <option key={theme.value} value={theme.value}>
                                                {theme.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{uiLang === 'en' ? 'Receipt (RECEIPT)' : 'ใบเสร็จ (RECEIPT)'}</label>
                                    <select
                                        name="pdfThemeReceipt"
                                        value={formData.pdfThemeReceipt || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    >
                                        <option value="">{uiLang === 'en' ? 'Use main theme' : 'ใช้ดีไซน์หลัก'}</option>
                                        {PDF_THEME_OPTIONS.map((theme) => (
                                            <option key={theme.value} value={theme.value}>
                                                {theme.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-4 text-xs leading-5 text-gray-600 dark:text-slate-300">
                                    {uiLang === 'en' ? 'Credit Note and Debit Note use the quotation theme by default to keep adjustment documents in the same family.' : 'Credit Note และ Debit Note จะใช้ดีไซน์ของใบเสนอราคาเป็นค่าเริ่มต้น เพื่อคุมงานปรับยอดให้อยู่ใน family เดียวกัน'}
                                </div>
                            </div>
                        </div>

                        {/* Branding Images */}
                        <div className="border-t dark:border-slate-700 pt-8">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                                <ImageIcon className="h-5 w-5 text-emerald-600" />
                                รูปภาพและเอกลักษณ์
                            </h3>
                            <div className="grid gap-6 sm:grid-cols-3">
                                {/* Logo */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">โลโก้ (Logo)</label>
                                    <div className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700">
                                        {formData.logoUrl ? (
                                            <div className="relative h-full w-full">
                                                <img src={formData.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, logoUrl: null }))}
                                                    className="absolute right-2 top-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                                                <UploadCloud className="mb-2 h-8 w-8" />
                                                <span className="text-xs">คลิกเพื่ออัปโหลด</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'logoUrl')}
                                            disabled={!!uploading['logoUrl']}
                                            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                        />
                                        {uploading['logoUrl'] && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
                                                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">แสดงมุมบนซ้ายของเอกสาร</p>
                                </div>

                                {/* Stamp */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">ตราประทับ (Stamp)</label>
                                    <div className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700">
                                        {formData.stampUrl ? (
                                            <div className="relative h-full w-full">
                                                <img src={formData.stampUrl} alt="Stamp" className="h-full w-full object-contain p-2" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, stampUrl: null }))}
                                                    className="absolute right-2 top-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                                                <UploadCloud className="mb-2 h-8 w-8" />
                                                <span className="text-xs">คลิกเพื่ออัปโหลด</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'stampUrl')}
                                            disabled={!!uploading['stampUrl']}
                                            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                        />
                                        {uploading['stampUrl'] && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
                                                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">แสดงทับลายเซ็นผู้มีอำนาจ</p>
                                </div>

                                {/* Signature */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">ลายเซ็น (Signature)</label>
                                    <div className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700">
                                        {formData.signatureUrl ? (
                                            <div className="relative h-full w-full">
                                                <img src={formData.signatureUrl} alt="Signature" className="h-full w-full object-contain p-2" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, signatureUrl: null }))}
                                                    className="absolute right-2 top-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                                                <UploadCloud className="mb-2 h-8 w-8" />
                                                <span className="text-xs">คลิกเพื่ออัปโหลด</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'signatureUrl')}
                                            disabled={!!uploading['signatureUrl']}
                                            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                        />
                                        {uploading['signatureUrl'] && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
                                                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">แสดงในช่องผู้ออกเอกสาร</p>
                                </div>
                            </div>
                        </div>

                        {/* Bank Info */}
                        <div className="border-t dark:border-slate-700 pt-8">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                                <Building className="h-5 w-5 text-emerald-600" />
                                {copy.bankInfo}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{copy.bankName}</label>
                                    <div className="relative">
                                        {(() => {
                                            const displayBankName =
                                                formData.bankName === OTHER_BANK_VALUE
                                                    ? formData.bankNameCustom
                                                    : formData.bankName;
                                            const bankCode = displayBankName ? BANK_CODE_BY_NAME[displayBankName] : null;
                                            return (
                                                <>
                                                    <select
                                                        name="bankName"
                                                        value={formData.bankName || ''}
                                                        onChange={handleChange}
                                                        className="block w-full appearance-none rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-4 py-3 pl-12 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                    >
                                                        <option value="">{copy.selectBank}</option>
                                                        <optgroup label={copy.popularBanks}>
                                                            <option value="กสิกรไทย">กสิกรไทย</option>
                                                            <option value="ไทยพาณิชย์">ไทยพาณิชย์</option>
                                                            <option value="กรุงเทพ">กรุงเทพ</option>
                                                            <option value="กรุงไทย">กรุงไทย</option>
                                                            <option value="กรุงศรีอยุธยา">กรุงศรีอยุธยา</option>
                                                            <option value="ทีเอ็มบีธนชาต">ทีเอ็มบีธนชาต</option>
                                                        </optgroup>
                                                        <optgroup label={copy.stateBanks}>
                                                            <option value="ออมสิน">ออมสิน</option>
                                                            <option value="อาคารสงเคราะห์">อาคารสงเคราะห์</option>
                                                            <option value="ธ.ก.ส.">ธ.ก.ส.</option>
                                                        </optgroup>
                                                        <optgroup label={copy.otherBanks}>
                                                            <option value="ซีไอเอ็มบี">ซีไอเอ็มบี</option>
                                                            <option value="ยูโอบี">ยูโอบี</option>
                                                            <option value="ทิสโก้">ทิสโก้</option>
                                                            <option value="เกียรตินาคินภัทร">เกียรตินาคินภัทร</option>
                                                            <option value="อิสลามแห่งประเทศไทย">อิสลามแห่งประเทศไทย</option>
                                                            <option value="แลนด์ แอนด์ เฮ้าส์">แลนด์ แอนด์ เฮ้าส์</option>
                                                            <option value="ไทยเครดิต">ไทยเครดิต</option>
                                                            <option value="ไอซีบีซี">ไอซีบีซี</option>
                                                            <option value="ซิตี้แบงก์">ซิตี้แบงก์</option>
                                                            <option value="เอชเอสบีซี">เอชเอสบีซี</option>
                                                            <option value="ธนชาต">ธนชาต</option>
                                                        </optgroup>
                                                        <optgroup label="—">
                                                            <option value={OTHER_BANK_VALUE}>{copy.customBank}</option>
                                                        </optgroup>
                                                    </select>
                                                    {bankCode ? (
                                                        <img
                                                            src={`https://storage.googleapis.com/ezdoc-assets/payment-logos/banks/${bankCode}.png`}
                                                            alt={formData.bankName || ''}
                                                            className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded object-contain"
                                                        />
                                                    ) : (
                                                        <div className="absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded bg-gray-100 dark:bg-slate-700">
                                                            <Building className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    {formData.bankName === OTHER_BANK_VALUE && (
                                        <input
                                            type="text"
                                            name="bankNameCustom"
                                            value={formData.bankNameCustom || ''}
                                            onChange={handleChange}
                                            placeholder={copy.customBankPlaceholder}
                                            className="mt-2 block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    )}
                                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{copy.knownBankOnlyHint}</p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{copy.bankAccountNo}</label>
                                    <input
                                        type="text"
                                        name="bankAccountNo"
                                        value={formData.bankAccountNo || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder="xxx-x-xxxxx-x"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{copy.bankAccountName}</label>
                                    <input
                                        type="text"
                                        name="bankAccountName"
                                        value={formData.bankAccountName || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder={copy.bankAccountNamePlaceholder}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* PromptPay / QR */}
                        <div className="border-t dark:border-slate-700 pt-8">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                                <CreditCard className="h-5 w-5 text-emerald-600" />
                                {uiLang === 'en' ? 'PromptPay / QR' : 'พร้อมเพย์ / QR'}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{copy.promptpayAccount}</label>
                                    <input
                                        type="text"
                                        name="promptpayAccount"
                                        value={formData.promptpayAccount || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder={copy.promptpayAccountPlaceholder}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{copy.promptpayName}</label>
                                    <input
                                        type="text"
                                        name="promptpayName"
                                        value={formData.promptpayName || ''}
                                        onChange={handleChange}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        placeholder={copy.promptpayNamePlaceholder}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">{uiLang === 'en' ? 'Upload PromptPay QR (optional)' : 'อัปโหลด QR พร้อมเพย์ (ถ้ามี)'}</label>
                                    <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700">
                                        {formData.promptpayQrUrl ? (
                                            <div className="relative h-full w-full">
                                                <img src={formData.promptpayQrUrl} alt="PromptPay QR" className="h-full w-full object-contain p-2" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, promptpayQrUrl: null }))}
                                                    className="absolute right-2 top-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                                                <UploadCloud className="mb-2 h-8 w-8" />
                                                <span className="text-xs">{uiLang === 'en' ? 'Click to upload' : 'คลิกเพื่ออัปโหลด'}</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'promptpayQrUrl')}
                                            disabled={!!uploading['promptpayQrUrl']}
                                            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                        />
                                        {uploading['promptpayQrUrl'] && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
                                                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                        {uiLang === 'en' ? 'If you do not upload a QR image, EzDOC will generate one from the PromptPay number automatically.' : 'ถ้าไม่อัปโหลด ระบบจะสร้าง QR จากเลขพร้อมเพย์ให้อัตโนมัติ'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Message */}
                        {message && (
                            <div className={`flex items-center gap-2 rounded-xl p-4 ${message.type === 'success'
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                                }`}>
                                {message.type === 'success' ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5" />
                                )}
                                {message.text}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end border-t dark:border-slate-700 pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                {loading ? copy.saving : copy.saveButton}
                            </button>
                        </div>
                    </form>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{copy.settingsTitle}</h2>

                        {/* Notifications */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200">{copy.notificationTitle}</h3>

                            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-slate-100">{copy.emailNotificationTitle}</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">{copy.emailNotificationDesc}</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center">
                                    <input
                                        type="checkbox"
                                        checked={settings.emailNotifications}
                                        onChange={(e) => handleSettingsChange('emailNotifications', e.target.checked)}
                                        disabled
                                        className="peer sr-only"
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-gray-200 dark:bg-slate-600 opacity-60 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 dark:after:border-slate-500 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-slate-100">{copy.lineNotificationTitle}</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">{copy.lineNotificationDesc}</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center">
                                    <input
                                        type="checkbox"
                                        checked={settings.lineNotifications}
                                        onChange={(e) => handleSettingsChange('lineNotifications', e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-gray-200 dark:bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 dark:after:border-slate-500 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300"></div>
                                </label>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="space-y-4 border-t dark:border-slate-700 pt-6">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200">{copy.languageTitle}</h3>
                            <div>
                                <select
                                    value={settings.language}
                                    onChange={(e) => handleSettingsChange('language', e.target.value)}
                                    className="block w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm dark:bg-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value="th">🇹🇭 ภาษาไทย</option>
                                    <option value="en">🇺🇸 English</option>
                                </select>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="space-y-4 border-t dark:border-slate-700 pt-6">
                            <h3 className="text-sm font-medium text-red-600">{copy.dangerZone}</h3>
                            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-red-700 dark:text-red-400">{copy.deleteAccountTitle}</p>
                                        <p className="text-sm text-red-600 dark:text-red-500">{copy.deleteAccountDesc}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteAccount()}
                                        disabled={deletingAccount}
                                        className="rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {deletingAccount ? copy.deletingAccount : copy.deleteAccountButton}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end border-t dark:border-slate-700 pt-6">
                            <button
                                type="button"
                                onClick={() => void handleSaveSettings()}
                                disabled={settingsLoading}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50"
                            >
                                {settingsLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                {settingsLoading ? copy.saving : copy.saveSettingsButton}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
