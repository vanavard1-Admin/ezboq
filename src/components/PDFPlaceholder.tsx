import { QrCode, ImageIcon } from 'lucide-react';

interface PDFPlaceholderProps {
  type?: 'qr' | 'image';
  width?: number;
  height?: number;
  text?: string;
}

/**
 * Placeholder component for images and QR codes in PDF exports
 * This prevents PNG signature errors caused by external images
 */
export function PDFPlaceholder({ 
  type = 'qr', 
  width = 150, 
  height = 150,
  text
}: PDFPlaceholderProps) {
  const Icon = type === 'qr' ? QrCode : ImageIcon;
  const defaultText = type === 'qr' ? 'QR Code' : 'รูปภาพ';
  
  return (
    <div
      className="pdf-placeholder"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: '2px dashed #d1d5db',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'center',
        padding: '10px',
        background: '#f9fafb',
        borderRadius: '4px',
      }}
    >
      <Icon style={{ width: '24px', height: '24px', marginBottom: '8px' }} />
      <span>{text || defaultText}</span>
    </div>
  );
}
