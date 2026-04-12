import React from 'react';
import { Building2, Eye, ImageIcon, Pencil, Upload, X } from 'lucide-react';
import type { CompanyProfile } from '../utils/companyProfile';
import { loadCompanyProfile } from '../utils/companyProfile';
import type { PresentationBoardData, ProjectData } from '../utils/projectData';

interface PresentationBoardDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  onUpdate?: (project: ProjectData) => void;
}

type BoardImageSlot = 'featureImage' | 'heroImage';

function getDefaultBoard(project: ProjectData, companyProfile: CompanyProfile): PresentationBoardData {
  return {
    title: project.name || 'Project Presentation',
    subtitle: 'Concept & Material Board',
    brandLabel: companyProfile.companyName || 'EZBOQ STUDIO',
    featureImage: '',
    heroImage: '',
  };
}

function getSlotLabel(slot: BoardImageSlot): string {
  return slot === 'featureImage' ? 'ภาพที่ 1' : 'ภาพที่ 2';
}

function getSlotHint(slot: BoardImageSlot): string {
  return slot === 'featureImage'
    ? 'ใช้เป็นภาพใหญ่ด้านล่างของหน้า'
    : 'ใช้เป็นภาพฮีโร่ด้านบนเหมือน ref';
}

function PlaceholderCard({ label, hint, compact = false }: { label: string; hint: string; compact?: boolean }) {
  return (
    <div className={`flex h-full items-center justify-center border border-stone-200 bg-stone-50 text-center ${compact ? 'min-h-[120px]' : 'min-h-[220px]'}`}>
      <div className="px-6 py-6">
        <ImageIcon className="mx-auto h-8 w-8 text-stone-300" />
        <p className="mt-3 text-xs uppercase tracking-[0.24em] text-stone-400">{label}</p>
        <p className="mt-1 text-sm text-stone-500">{hint}</p>
      </div>
    </div>
  );
}

function PresentationImage({
  src,
  alt,
  className,
  objectPosition = 'center center',
  compact = false,
}: {
  src?: string;
  alt: string;
  className: string;
  objectPosition?: string;
  compact?: boolean;
}) {
  if (!src) {
    return <PlaceholderCard label={alt} hint="อัปโหลดรูปเพื่อแสดงใน layout" compact={compact} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ objectPosition }}
    />
  );
}

async function readImageAsDataUrl(file: File): Promise<string> {
  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปได้'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปได้'));
    img.src = originalDataUrl;
  });

  const maxWidth = 1600;
  const maxHeight = 1200;
  const ratio = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return originalDataUrl;
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function PresentationBoardDocument({
  project,
  companyProfile,
  onUpdate,
}: PresentationBoardDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState<BoardImageSlot | null>(null);
  const company = companyProfile || loadCompanyProfile();
  const board = {
    ...getDefaultBoard(project, company),
    ...(project.presentationBoard || {}),
  };

  const heroImage = board.heroImage || board.featureImage;
  const featureImage = board.featureImage || board.heroImage;
  const detailStripImages = [
    { src: featureImage, position: 'left center' },
    { src: heroImage, position: 'center center' },
    { src: featureImage || heroImage, position: 'right center' },
  ];

  const updateBoard = (patch: Partial<PresentationBoardData>) => {
    if (!onUpdate) return;
    onUpdate({
      ...project,
      presentationBoard: {
        ...board,
        ...patch,
      },
    });
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    slot: BoardImageSlot,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(slot);
    try {
      const dataUrl = await readImageAsDataUrl(file);
      updateBoard({ [slot]: dataUrl });
    } finally {
      setIsUploading(null);
    }
  };

  const clearImage = (slot: BoardImageSlot) => {
    updateBoard({ [slot]: '' });
  };

  return (
    <div id="presentation-board-doc" className="mx-auto max-w-[210mm] bg-white print:shadow-none">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          #presentation-board-doc {
            max-width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="border-b border-stone-300 border-t-[6px] border-t-emerald-900 bg-white px-6 py-5 print:page-break-inside-avoid">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center border border-stone-300 bg-white p-2">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-7 w-7 text-stone-500" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-[0.16em] text-stone-900">
                {company.companyName?.toUpperCase() || 'COMPANY NAME'}
              </h1>
              <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-stone-500">
                {company.tagline || 'Interior Design & Construction'}
              </p>
              <div className="mt-3">
                <p className="text-base font-semibold text-stone-900">Presentation Board</p>
                <p className="text-[10px] tracking-[0.22em] text-stone-500">IMAGE PRESENTATION LAYOUT</p>
              </div>
            </div>
          </div>

          <div className="print:hidden flex items-center gap-2">
            <button
              onClick={() => setIsEditing((current) => !current)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                isEditing
                  ? 'bg-[var(--doc-primary)] text-white'
                  : 'border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {isEditing ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {isEditing ? 'ดูพรีวิว' : 'แก้ไข'}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-stone-800"
            >
              พิมพ์เอกสาร
            </button>
          </div>
        </div>
      </div>

      {onUpdate && isEditing && (
        <div className="print:hidden border-b border-stone-200 bg-stone-50 px-6 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.22em] text-stone-500">Headline</span>
                <input
                  type="text"
                  value={board.title || ''}
                  onChange={(event) => updateBoard({ title: event.target.value })}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                  placeholder="เช่น A Quiet Luxury Bathroom"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.22em] text-stone-500">Subtitle</span>
                <input
                  type="text"
                  value={board.subtitle || ''}
                  onChange={(event) => updateBoard({ subtitle: event.target.value })}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                  placeholder="เช่น Design & Material Direction"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-[0.22em] text-stone-500">Brand Label</span>
                <input
                  type="text"
                  value={board.brandLabel || ''}
                  onChange={(event) => updateBoard({ brandLabel: event.target.value })}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-stone-400 focus:outline-none"
                  placeholder="เช่น EZBOQ STUDIO"
                />
              </label>
            </div>

            <div className="space-y-3">
              {(['featureImage', 'heroImage'] as BoardImageSlot[]).map((slot) => (
                <div key={slot} className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{getSlotLabel(slot)}</p>
                      <p className="mt-1 text-sm text-stone-700">{getSlotHint(slot)}</p>
                    </div>
                    {board[slot] && (
                      <button
                        onClick={() => clearImage(slot)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-700"
                        title="ลบรูป"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--doc-primary)] px-3 py-2 text-sm text-white transition-colors hover:bg-[var(--doc-primary-hover)]">
                      <Upload className="h-4 w-4" />
                      {isUploading === slot ? 'กำลังประมวลผล...' : 'อัปโหลดรูป'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void handleImageChange(event, slot)}
                      />
                    </label>
                    <p className="text-xs text-stone-400">ระบบจะย่อรูปให้อัตโนมัติก่อนบันทึก</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#f8f6f1] px-6 py-6">
        <div className="border border-[#d8d2c8] bg-white p-3 md:p-4">
          <div className="grid gap-3 md:grid-cols-[1.05fr_2.25fr]">
            <div className="flex min-h-[280px] flex-col justify-center border-y border-[#d8d2c8] px-6 py-8 text-center">
              <p className="text-[11px] uppercase tracking-[0.38em] text-stone-500">
                {board.brandLabel || company.companyName || 'DESIGN STUDIO'}
              </p>
              <p className="mt-1 text-[11px] text-stone-400">
                {board.subtitle || company.tagline || 'Design & Construction'}
              </p>
              <h2 className="mx-auto mt-8 max-w-[13rem] text-3xl font-light leading-tight text-stone-700">
                {board.title || project.name || 'Project Presentation'}
              </h2>
            </div>

            <div className="overflow-hidden border border-[#d8d2c8] bg-white">
              <PresentationImage
                src={heroImage}
                alt="Hero Image"
                className="h-full min-h-[280px] w-full object-cover"
                compact={false}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1.15fr_1fr_1fr]">
            {detailStripImages.map((detail, index) => (
              <div key={`${detail.position}-${index}`} className="overflow-hidden border border-[#d8d2c8] bg-white">
                <PresentationImage
                  src={detail.src}
                  alt={`Detail ${index + 1}`}
                  className="h-[132px] w-full object-cover"
                  objectPosition={detail.position}
                  compact
                />
              </div>
            ))}
          </div>

          <div className="border-x border-b border-[#d8d2c8] px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.38em] text-stone-500">
              {board.brandLabel || company.companyName || 'DESIGN STUDIO'}
            </p>
            <p className="mt-1 text-[11px] text-stone-400">
              {board.subtitle || company.tagline || 'Design & Construction'}
            </p>
          </div>
        </div>

        <div className="mt-10 border border-[#d8d2c8] bg-white p-4">
          <div className="overflow-hidden bg-white">
            <PresentationImage
              src={featureImage}
              alt="Feature Image"
              className="h-auto max-h-[480px] min-h-[320px] w-full object-cover"
              compact={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
