'use client';

import { useState } from 'react';

export default function VatCalculator() {
    const [amount, setAmount] = useState<number | string>('');
    const [isVatIncluded, setIsVatIncluded] = useState(true);

    const VAT_RATE = 0.07;

    // Derive result directly from render (no sync effect problems)
    const val = parseFloat(amount.toString());
    const isValid = !isNaN(val) && val >= 0;

    let result = null;
    if (isValid) {
        let priceBeforeVat = 0;
        let vatAmount = 0;
        let totalPrice = 0;

        if (isVatIncluded) {
            priceBeforeVat = val / 1.07;
            vatAmount = val - priceBeforeVat;
            totalPrice = val;
        } else {
            priceBeforeVat = val;
            vatAmount = val * VAT_RATE;
            totalPrice = val + vatAmount;
        }

        result = { priceBeforeVat, vatAmount, totalPrice };
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
        }).format(val);
    };

    return (
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 md:p-10">
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
                    🧮
                </div>
                <h1 className="text-3xl font-bold text-slate-900">เครื่องคำนวณ VAT 7%</h1>
                <p className="mt-2 text-slate-500">
                    คิดภาษีมูลค่าเพิ่มง่ายๆ จะ &quot;รวมใน&quot; หรือ &quot;แยกนอก&quot; ก็รู้ผลทันที
                </p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                        จำนวนเงิน (บาท)
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="เช่น 1000"
                        className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                        autoFocus
                    />
                </div>

                <div className="flex rounded-xl bg-slate-100 p-1.5">
                    <button
                        onClick={() => setIsVatIncluded(true)}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${isVatIncluded
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        ราคารวม VAT แล้ว (ถอด VAT)
                    </button>
                    <button
                        onClick={() => setIsVatIncluded(false)}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${!isVatIncluded
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        ราคาไม่รวม VAT (คิด VAT เพิ่ม)
                    </button>
                </div>

                {/* Result Display */}
                <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white shadow-2xl shadow-slate-900/20">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl"></div>

                    <div className="relative space-y-4">
                        <div className="flex justify-between border-b border-white/10 pb-4 text-sm text-slate-400">
                            <span>ราคาก่อน VAT (Pre-VAT)</span>
                            <span className="font-mono">{result ? formatCurrency(result.priceBeforeVat) : '-'}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/10 pb-4 text-sm text-emerald-400">
                            <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                            <span className="font-mono">+{result ? formatCurrency(result.vatAmount) : '-'}</span>
                        </div>
                        <div className="flex items-end justify-between pt-2">
                            <span className="mb-1 font-medium text-slate-300">ราคาสุทธิ (Net Total)</span>
                            <span className="text-4xl font-bold tracking-tight">
                                {result ? formatCurrency(result.totalPrice) : '0.00'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
