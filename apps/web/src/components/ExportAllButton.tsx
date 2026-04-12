import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import { ProjectData } from '../utils/projectData';
import { ContractDocument } from './ContractDocument';
import { CustomerQuotationDocument } from './CustomerQuotationDocument';
import { InvoiceDocument } from './InvoiceDocument';
import { PurchaseOrderDocument } from './PurchaseOrderDocument';
import { WorkPlanDocument } from './WorkPlanDocument';

interface ExportAllButtonProps {
  project: ProjectData;
  fullWidth?: boolean;
}

export function ExportAllButton({ project, fullWidth = false }: ExportAllButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [renderExportSurface, setRenderExportSurface] = useState(false);
  const [exportCompanyProfile, setExportCompanyProfile] = useState<CompanyProfile | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  const exportTargets = useMemo(() => [
    {
      elementId: 'export-bundle-customer-quotation',
      label: 'ใบเสนอราคา',
      filename: 'ใบเสนอราคา.pdf',
    },
    {
      elementId: 'export-bundle-invoice',
      label: 'ใบวางบิล',
      filename: 'ใบวางบิล.pdf',
    },
    {
      elementId: 'export-bundle-workplan',
      label: 'แผนการทำงาน',
      filename: 'แผนการทำงาน.pdf',
    },
    {
      elementId: 'export-bundle-contract',
      label: 'สัญญา',
      filename: 'สัญญา.pdf',
    },
    {
      elementId: 'export-bundle-purchase-order',
      label: 'ใบสั่งซื้อ',
      filename: 'ใบสั่งซื้อ.pdf',
    },
  ], []);

  const clearResetTimer = () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  const resetExportState = (delay = 0) => {
    clearResetTimer();
    resetTimerRef.current = window.setTimeout(() => {
      setIsExporting(false);
      setProgress(0);
      setStatusMessage('');
      setRenderExportSurface(false);
      setExportCompanyProfile(null);
      resetTimerRef.current = null;
    }, delay);
  };

  useEffect(() => () => {
    clearResetTimer();
  }, []);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setProgress(5);
    setStatusMessage('กำลังเตรียม surface สำหรับ export...');
    setExportCompanyProfile(loadCompanyProfile());
    setRenderExportSurface(true);
  };

  useEffect(() => {
    if (!isExporting || !renderExportSurface || !exportCompanyProfile) return;

    let cancelled = false;

    const runExport = async () => {
      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });

        if (cancelled) return;

        const { exportAllDocumentsAsZip } = await import('../utils/exportUtils');
        await exportAllDocumentsAsZip(
          project.name,
          exportTargets,
          (message, progressValue) => {
            if (cancelled) return;
            setStatusMessage(message);
            setProgress(progressValue);
          },
        );

        if (cancelled) return;
        setStatusMessage('Export เอกสารทั้งหมดเสร็จแล้ว');
        setProgress(100);
        toast.success('สร้าง ZIP เอกสารทั้งหมดแล้ว');
        resetExportState(1600);
      } catch (error) {
        if (cancelled) return;
        console.error('ZIP export failed:', error);
        setStatusMessage(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        toast.error(error instanceof Error ? error.message : 'Export ZIP ไม่สำเร็จ');
        resetExportState(2600);
      } finally {
        if (!cancelled) {
          setRenderExportSurface(false);
        }
      }
    };

    void runExport();

    return () => {
      cancelled = true;
    };
  }, [exportCompanyProfile, exportTargets, isExporting, project.name, renderExportSurface]);

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          fullWidth ? 'w-full justify-center' : ''
        } ${
          isExporting
            ? 'cursor-not-allowed bg-stone-100 text-stone-500'
            : 'bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white'
        }`}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>กำลัง Export...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Export ทั้งหมด (ZIP)</span>
          </>
        )}
      </button>

      {isExporting && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-lg border border-stone-200 bg-white p-3 shadow-lg">
          <div className="mb-2 text-xs text-stone-800">{statusMessage}</div>
          <div className="h-2 w-full rounded-full bg-stone-200">
            <div
              className="h-2 rounded-full bg-[var(--doc-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs text-stone-500">{Math.round(progress)}%</div>
        </div>
      )}

      {renderExportSurface && exportCompanyProfile && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-[-200vw] top-0 z-[-1] w-[1280px] overflow-hidden opacity-0"
        >
          <div id="export-bundle-customer-quotation" className="bg-white">
            <CustomerQuotationDocument project={project} companyProfile={exportCompanyProfile} />
          </div>
          <div id="export-bundle-invoice" className="mt-10 bg-white">
            <InvoiceDocument project={project} companyProfile={exportCompanyProfile} />
          </div>
          <div id="export-bundle-workplan" className="mt-10 bg-white">
            <WorkPlanDocument project={project} companyProfile={exportCompanyProfile} />
          </div>
          <div id="export-bundle-contract" className="mt-10 bg-white">
            <ContractDocument project={project} companyProfile={exportCompanyProfile} />
          </div>
          <div id="export-bundle-purchase-order" className="mt-10 bg-white">
            <PurchaseOrderDocument project={project} companyProfile={exportCompanyProfile} />
          </div>
        </div>
      )}
    </div>
  );
}
