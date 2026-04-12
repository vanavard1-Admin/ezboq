'use client';

import { useState } from 'react';
import { PaymentCategory } from '@/lib/paymentLogos';
import { 
  getAllPaymentMethods, 
  getPaymentMethodName, 
  getPaymentLogoUrl 
} from '@/lib/paymentUtils';
import Image from 'next/image';

export interface PaymentMethods {
  banks?: string[];
  cards?: string[];
  wallets?: string[];
}

interface PaymentMethodPickerProps {
  value: PaymentMethods;
  onChange: (methods: PaymentMethods) => void;
  className?: string;
}

export function PaymentMethodPicker({ 
  value, 
  onChange, 
  className = '' 
}: PaymentMethodPickerProps) {
  const [activeTab, setActiveTab] = useState<PaymentCategory>('banks');
  const allMethods = getAllPaymentMethods();

  const handleToggle = (category: PaymentCategory, key: string) => {
    const current = value[category] || [];
    const newValue = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key];
    
    onChange({
      ...value,
      [category]: newValue,
    });
  };

  const isSelected = (category: PaymentCategory, key: string) => {
    return (value[category] || []).includes(key);
  };

  const renderMethodGrid = (category: PaymentCategory) => {
    const methods = allMethods[category];
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {methods.map((key) => {
          const selected = isSelected(category, key);
          const logoUrl = getPaymentLogoUrl(key, category);
          const name = getPaymentMethodName(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleToggle(category, key)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                ${selected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              {logoUrl && (
                <Image
                  src={logoUrl}
                  alt={name}
                  width={80}
                  height={32}
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="text-xs text-center text-gray-700 line-clamp-2">
                {name}
              </span>
              {selected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const tabs: { key: PaymentCategory; label: string }[] = [
    { key: 'banks', label: 'ธนาคาร' },
    { key: 'cards', label: 'บัตรเครดิต' },
    { key: 'wallets', label: 'กระเป๋าเงินอิเล็กทรอนิกส์' },
  ];

  return (
    <div className={className}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-4" aria-label="Tabs">
          {tabs.map((tab) => {
            const count = (value[tab.key] || []).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`
                  py-2 px-4 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-2 py-0.5 px-2 rounded-full bg-blue-100 text-blue-600 text-xs">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Method Grid */}
      <div className="min-h-[200px]">
        {renderMethodGrid(activeTab)}
      </div>

      {/* Selected Summary */}
      {(value.banks?.length || value.cards?.length || value.wallets?.length) ? (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            เลือกแล้ว: {' '}
            <span className="font-medium">
              {(value.banks?.length || 0) + (value.cards?.length || 0) + (value.wallets?.length || 0)} วิธี
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Display selected payment methods as logos
 */
interface PaymentMethodDisplayProps {
  methods: PaymentMethods;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PaymentMethodDisplay({ 
  methods, 
  size = 'md',
  className = '' 
}: PaymentMethodDisplayProps) {
  const sizeClasses = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
  };
  const sizePx = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const allSelected: Array<{ key: string; category: PaymentCategory }> = [
    ...(methods.banks || []).map(key => ({ key, category: 'banks' as PaymentCategory })),
    ...(methods.cards || []).map(key => ({ key, category: 'cards' as PaymentCategory })),
    ...(methods.wallets || []).map(key => ({ key, category: 'wallets' as PaymentCategory })),
  ];

  if (allSelected.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      {allSelected.map(({ key, category }) => {
        const logoUrl = getPaymentLogoUrl(key, category);
        const name = getPaymentMethodName(key);

        return logoUrl ? (
          <Image
            key={`${category}-${key}`}
            src={logoUrl}
            alt={name}
            title={name}
            width={64}
            height={sizePx[size]}
            className={`${sizeClasses[size]} w-auto object-contain`}
            style={{ width: 'auto', height: `${sizePx[size]}px` }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span key={`${category}-${key}`} className="text-xs text-gray-600">
            {name}
          </span>
        );
      })}
    </div>
  );
}
