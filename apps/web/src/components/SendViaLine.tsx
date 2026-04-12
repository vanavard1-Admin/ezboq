import React, { useState } from 'react';

interface SendViaLineProps {
  userId: string;
  documentId: string;
  documentName: string;
  documentUrl?: string;
  exportElementId?: string;
  onSuccess?: (messageId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const SendViaLine: React.FC<SendViaLineProps> = ({
  documentName,
  documentUrl,
  exportElementId,
  onSuccess,
  onError,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [messageId, setMessageId] = useState('');

  const resetForm = () => {
    setCustomMessage('');
    setStatus('idle');
    setErrorMessage('');
    setMessageId('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const shareText = customMessage || `📄 เอกสาร: ${documentName}`;

  const handleSendDocument = async () => {
    if (!exportElementId && !documentUrl) {
      const message = 'ยังไม่พบ PDF หรือ document URL สำหรับแชร์';
      setStatus('error');
      setErrorMessage(message);
      onError?.(message);
      return;
    }

    try {
      setIsSending(true);
      setStatus('sending');
      setErrorMessage('');

      if (exportElementId) {
        const { exportDocumentAsPDF, sharePdfFile } = await import('../utils/exportUtils');
        const pdfBlob = await exportDocumentAsPDF(exportElementId, `${documentName}.pdf`, undefined, { download: false });
        const shared = await sharePdfFile(pdfBlob, `${documentName}.pdf`, shareText);

        if (!shared) {
          await exportDocumentAsPDF(exportElementId, `${documentName}.pdf`, undefined, { download: true });
          const message = 'อุปกรณ์นี้ยังแชร์ไฟล์เข้า LINE โดยตรงไม่ได้ จึงดาวน์โหลด PDF ให้แทนแล้ว';
          setStatus('sent');
          setMessageId('downloaded-pdf');
          onSuccess?.('downloaded-pdf');
          setErrorMessage(message);
        } else {
          setStatus('sent');
          setMessageId('shared-pdf');
          onSuccess?.('shared-pdf');
        }
      } else if (documentUrl) {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({
            title: documentName,
            text: shareText,
            url: documentUrl,
          });
          setStatus('sent');
          setMessageId('shared-link');
          onSuccess?.('shared-link');
        } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(documentUrl);
          setStatus('sent');
          setMessageId('copied-link');
          setErrorMessage('คัดลอกลิงก์เอกสารแล้ว สามารถวางส่งใน LINE ได้ทันที');
          onSuccess?.('copied-link');
        } else {
          window.open(documentUrl, '_blank', 'noopener,noreferrer');
          setStatus('sent');
          setMessageId('opened-link');
          onSuccess?.('opened-link');
        }
      }

      window.setTimeout(() => {
        setIsModalOpen(false);
        resetForm();
      }, 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('idle');
        setErrorMessage('');
        return;
      }

      setStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsModalOpen(true);
          resetForm();
        }}
        className={`inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors ${className}`}
      >
        <span className="mr-2">📱</span>
        ส่งผ่าน LINE
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={handleCloseModal}
            />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                  <span className="text-xl">📱</span>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    ส่งเอกสารผ่าน LINE
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      เอกสาร: <strong>{documentName}</strong>
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      ระบบจะเปิด share sheet เพื่อให้เลือก LINE หรือดาวน์โหลด PDF ให้แทนเมื่ออุปกรณ์ยังแชร์ไฟล์ตรงไม่ได้
                    </p>
                  </div>

                  {status === 'idle' && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          ข้อความ
                        </label>
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          rows={3}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                          placeholder={shareText}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          ไม่ระบุ = ใช้ข้อความเริ่มต้น
                        </p>
                      </div>
                    </div>
                  )}

                  {status === 'sending' && (
                    <div className="mt-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">กำลังเตรียมเอกสาร...</p>
                    </div>
                  )}

                  {status === 'sent' && (
                    <div className="mt-4 text-center">
                      <div className="text-green-600 text-4xl mb-2">✅</div>
                      <p className="text-sm text-green-600 font-medium">พร้อมส่งต่อแล้ว</p>
                      <p className="text-xs text-gray-500 mt-1">Reference: {messageId}</p>
                      {errorMessage && (
                        <p className="mt-2 text-xs text-gray-600">{errorMessage}</p>
                      )}
                    </div>
                  )}

                  {status === 'error' && (
                    <div className="mt-4 text-center">
                      <div className="text-red-600 text-4xl mb-2">❌</div>
                      <p className="text-sm text-red-600 font-medium">เกิดข้อผิดพลาด</p>
                      <p className="text-xs text-gray-600 mt-1">{errorMessage}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                {status === 'idle' && (
                  <>
                    <button
                      type="button"
                      onClick={handleSendDocument}
                      disabled={isSending}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {isSending ? 'กำลังส่ง...' : 'ส่งเอกสาร'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      ยกเลิก
                    </button>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('idle');
                        setErrorMessage('');
                      }}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      ลองใหม่
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      ปิด
                    </button>
                  </>
                )}

                {status === 'sent' && (
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:w-auto sm:text-sm"
                  >
                    ปิด
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
