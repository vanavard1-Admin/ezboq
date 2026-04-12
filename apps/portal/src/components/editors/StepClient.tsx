import { Customer } from '@/lib/repos/customers.repo';

interface StepClientProps {
    docType: 'QUO' | 'BILL' | 'RECEIPT' | 'CN' | 'DN';
    setDocType: (type: 'QUO' | 'BILL' | 'RECEIPT' | 'CN' | 'DN') => void;
    issueDate: string;
    setIssueDate: (date: string) => void;
    customerId: string;
    setCustomerId: (id: string) => void;
    customers: Customer[];
    subjectTh: string;
    setSubjectTh: (subject: string) => void;
    isReadOnly: boolean;
    isNew: boolean;
}

export function StepClient({
    docType,
    setDocType,
    issueDate,
    setIssueDate,
    customerId,
    setCustomerId,
    customers,
    subjectTh,
    setSubjectTh,
    isReadOnly,
    isNew
}: StepClientProps) {
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">ประเภทเอกสาร</label>
                    <select
                        disabled={!isNew}
                        value={docType}
                        onChange={(e) => {
                            const nextType = e.target.value as 'QUO' | 'BILL' | 'RECEIPT' | 'CN' | 'DN';
                            setDocType(nextType);
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                    >
                        <option value="QUO">ใบเสนอราคา</option>
                        <option value="BILL">ใบวางบิล</option>
                        <option value="RECEIPT">ใบเสร็จรับเงิน</option>
                        <option value="CN">ใบลดหนี้ (CN)</option>
                        <option value="DN">ใบเพิ่มหนี้ (DN)</option>
                    </select>
                    {!isNew && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">ไม่สามารถเปลี่ยนประเภทเอกสารได้หลังจากสร้างแล้ว</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">วันที่ออกเอกสาร</label>
                    <input
                        type="date"
                        disabled={isReadOnly}
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">ลูกค้า <span className="text-red-500">*</span></label>
                    <select
                        disabled={isReadOnly}
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 ${!customerId && !isNew ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'
                            }`}
                    >
                        <option value="">-- เลือกลูกค้า --</option>
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.displayName} ({c.type})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">หัวข้อเอกสาร <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        disabled={isReadOnly}
                        value={subjectTh}
                        onChange={(e) => setSubjectTh(e.target.value)}
                        placeholder="ชื่อโปรเจกต์หรือรายละเอียดงาน"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                    />
                </div>
            </div>
        </div>
    );
}
