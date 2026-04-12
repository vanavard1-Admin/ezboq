interface StepReviewProps {
    docType: 'QUO' | 'BILL' | 'RECEIPT' | 'CN' | 'DN';
    subtotal: number;
    discount: number;
    setDiscount: (val: number) => void;
    extraFee: number;
    setExtraFee: (val: number) => void;
    vatEnabled: boolean;
    setVatEnabled: (val: boolean) => void;
    vatRate: number;
    setVatRate: (val: number) => void;
    whtEnabled: boolean;
    setWhtEnabled: (val: boolean) => void;
    whtRate: number;
    setWhtRate: (val: number) => void;
    totalAmount: number;
    netReceive: number;
    vatAmount: number;
    whtAmount: number;
    paymentMilestones: Array<{
        label?: string | null;
        percent?: number | null;
        amount?: number | null;
        note?: string | null;
    }>;
    setPaymentMilestones: (val: Array<{
        label?: string | null;
        percent?: number | null;
        amount?: number | null;
        note?: string | null;
    }>) => void;
    isReadOnly: boolean;
}

export function StepReview({
    docType,
    subtotal,
    discount,
    setDiscount,
    extraFee,
    setExtraFee,
    vatEnabled,
    setVatEnabled,
    vatRate,
    setVatRate,
    whtEnabled,
    setWhtEnabled,
    whtRate,
    setWhtRate,
    totalAmount,
    netReceive,
    vatAmount,
    whtAmount,
    paymentMilestones,
    setPaymentMilestones,
    isReadOnly
}: StepReviewProps) {
    const handleMilestoneChange = (
        index: number,
        key: 'label' | 'percent' | 'amount' | 'note',
        value: string | number | null
    ) => {
        setPaymentMilestones(
            paymentMilestones.map((milestone, i) => {
                if (i !== index) return milestone;
                const next = { ...milestone, [key]: value };
                if (key === 'percent') {
                    const percentValue = Number(value) || 0;
                    const hasAmount = typeof next.amount === 'number' && next.amount > 0;
                    if (!hasAmount && percentValue > 0) {
                        next.amount = Math.round((totalAmount * (percentValue / 100)) * 100) / 100;
                    }
                }
                return next;
            })
        );
    };

    const handleAddMilestone = () => {
        setPaymentMilestones([
            ...paymentMilestones,
            {
                label: `งวดที่ ${paymentMilestones.length + 1}`,
                percent: null,
                amount: null,
                note: '',
            },
        ]);
    };

    const handleRemoveMilestone = (index: number) => {
        setPaymentMilestones(paymentMilestones.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">สรุปยอดเงิน</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Settings */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">ตั้งค่าภาษี</h4>

                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="vat"
                                    disabled={isReadOnly}
                                    checked={vatEnabled}
                                    onChange={(e) => setVatEnabled(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-600 rounded"
                                />
                                <label htmlFor="vat" className="ml-2 block text-sm text-gray-900 dark:text-slate-100">จดทะเบียน VAT</label>
                            </div>
                            {vatEnabled && (
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        disabled={isReadOnly}
                                        value={vatRate}
                                        onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                                        className="w-16 text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-1 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                                    />
                                    <span className="ml-1 text-sm text-gray-500 dark:text-slate-400">%</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="wht"
                                    disabled={isReadOnly}
                                    checked={whtEnabled}
                                    onChange={(e) => setWhtEnabled(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-600 rounded"
                                />
                                <label htmlFor="wht" className="ml-2 block text-sm text-gray-900 dark:text-slate-100">หัก ณ ที่จ่าย</label>
                            </div>
                            {whtEnabled && (
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        disabled={isReadOnly}
                                        value={whtRate}
                                        onChange={(e) => setWhtRate(parseFloat(e.target.value) || 0)}
                                        className="w-16 text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-1 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                                    />
                                    <span className="ml-1 text-sm text-gray-500 dark:text-slate-400">%</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-3 text-sm">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">ยอดรวม</h4>

                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-slate-400">รวมรายการ</span>
                            <span className="font-medium text-gray-900 dark:text-slate-100">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-slate-400">ส่วนลด (บาท)</span>
                            <input
                                type="number"
                                disabled={isReadOnly}
                                value={discount}
                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                className="w-28 text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-1 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-slate-400">ค่าธรรมเนียมเพิ่มเติม</span>
                            <input
                                type="number"
                                disabled={isReadOnly}
                                value={extraFee}
                                onChange={(e) => setExtraFee(parseFloat(e.target.value) || 0)}
                                className="w-28 text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-1 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                            />
                        </div>

                        {vatEnabled && (
                            <div className="flex justify-between items-center text-gray-600 dark:text-slate-300">
                                <span>VAT {vatRate}%</span>
                                <span>{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-3 border-t dark:border-slate-700">
                            <span className="font-bold text-gray-900 dark:text-slate-100 text-base">ยอดรวมทั้งหมด</span>
                            <span className="font-bold text-gray-900 dark:text-slate-100 text-base">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        {whtEnabled && (
                            <div className="flex justify-between items-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                <span className="text-sm">หัก ณ ที่จ่าย {whtRate}%</span>
                                <span>-{whtAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-3 border-t-2 border-indigo-100 dark:border-indigo-800 mt-2">
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 text-lg">ยอดรับสุทธิ</span>
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 text-lg">{netReceive.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {docType === 'BILL' && (
                <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">งวดงาน / Payment Milestones</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                เพิ่มงวดงานสำหรับใบวางบิล หรือปล่อยว่างเพื่อใช้ราคาเต็ม
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddMilestone}
                            disabled={isReadOnly}
                            className="px-3 py-2 text-sm font-medium rounded-md border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-slate-500 disabled:border-gray-200 dark:disabled:border-slate-700"
                        >
                            + เพิ่มงวดงาน
                        </button>
                    </div>

                    {paymentMilestones.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-700 rounded-md p-4">
                            ไม่มีงวดงาน ระบบจะคิดราคาเต็มของเอกสารนี้
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {paymentMilestones.map((milestone, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">งวด</label>
                                        <input
                                            type="text"
                                            disabled={isReadOnly}
                                            value={milestone.label || ''}
                                            onChange={(e) => handleMilestoneChange(index, 'label', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">%</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            disabled={isReadOnly}
                                            value={milestone.percent ?? ''}
                                            onChange={(e) => handleMilestoneChange(index, 'percent', e.target.value ? Number(e.target.value) : null)}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 text-right"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">จำนวนเงิน</label>
                                        <input
                                            type="number"
                                            min={0}
                                            disabled={isReadOnly}
                                            value={milestone.amount ?? ''}
                                            onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value ? Number(e.target.value) : null)}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 text-right"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">เงื่อนไข</label>
                                        <input
                                            type="text"
                                            disabled={isReadOnly}
                                            value={milestone.note || ''}
                                            onChange={(e) => handleMilestoneChange(index, 'note', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex md:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMilestone(index)}
                                            disabled={isReadOnly}
                                            className="mt-6 text-sm text-rose-500 hover:text-rose-600 disabled:cursor-not-allowed disabled:text-gray-300 dark:disabled:text-slate-600"
                                        >
                                            ลบ
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
