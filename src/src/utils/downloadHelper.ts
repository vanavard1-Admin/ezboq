/**
 * Download Helper Utility
 * Handles file downloads for both desktop and mobile devices
 */

/**
 * Check if running on mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Check if running on iOS device
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

/**
 * Download file with mobile support
 * Works on both desktop and mobile browsers
 */
export const downloadFile = (
  blob: Blob,
  filename: string,
  mimeType: string
): void => {
  try {
    const isMobile = isMobileDevice();
    const isIOS = isIOSDevice();
    
    console.log('📥 Starting download:', {
      filename,
      size: blob.size,
      type: mimeType,
      isMobile,
      isIOS,
    });

    // Method 1: Try using the download attribute (works on most modern browsers)
    if (!isIOS) {
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log('✅ Download triggered successfully (Method 1)');
        }, 100);
        
        return;
      } catch (error) {
        console.warn('⚠️ Method 1 failed, trying Method 2:', error);
      }
    }

    // Method 2: For iOS or if Method 1 fails - Open in new window
    if (isIOS || isMobile) {
      try {
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64data = reader.result as string;
          
          // For iOS, we need to open in a new window with data URL
          const newWindow = window.open('', '_blank');
          
          if (newWindow) {
            newWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>${filename}</title>
                  <style>
                    body {
                      margin: 0;
                      padding: 20px;
                      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                      background: #f5f5f5;
                    }
                    .container {
                      max-width: 600px;
                      margin: 0 auto;
                      background: white;
                      padding: 30px;
                      border-radius: 12px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                      text-align: center;
                    }
                    h1 {
                      color: #333;
                      margin-bottom: 20px;
                      font-size: 24px;
                    }
                    p {
                      color: #666;
                      margin-bottom: 30px;
                      line-height: 1.6;
                    }
                    .download-btn {
                      display: inline-block;
                      background: #3b82f6;
                      color: white;
                      padding: 12px 32px;
                      border-radius: 8px;
                      text-decoration: none;
                      font-weight: 600;
                      font-size: 16px;
                      transition: background 0.3s;
                    }
                    .download-btn:hover {
                      background: #2563eb;
                    }
                    .download-btn:active {
                      background: #1d4ed8;
                    }
                    .filename {
                      background: #f3f4f6;
                      padding: 8px 16px;
                      border-radius: 6px;
                      color: #4b5563;
                      font-family: monospace;
                      font-size: 14px;
                      margin: 20px 0;
                      word-break: break-all;
                    }
                    .info {
                      font-size: 12px;
                      color: #9ca3af;
                      margin-top: 20px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>📥 ไฟล์พร้อมดาวน์โหลด</h1>
                    <p>กดปุ่มด้านล่างเพื่อดาวน์โหลดไฟล์</p>
                    <div class="filename">${filename}</div>
                    <a href="${base64data}" download="${filename}" class="download-btn">
                      ดาวน์โหลดไฟล์
                    </a>
                    <p class="info">
                      ${isIOS ? 'สำหรับ iOS: กดปุ่มดาวน์โหลด จากนั้นเลือก "ดาวน์โหลด" หรือ "บันทึกไฟล์"' : 'กดปุ่มด้านบนเพื่อดาวน์โหลด'}
                    </p>
                  </div>
                </body>
              </html>
            `);
            newWindow.document.close();
            console.log('✅ Download page opened successfully (Method 2)');
          } else {
            // Popup blocked, try Method 3
            throw new Error('Popup blocked');
          }
        };
        
        reader.onerror = () => {
          console.error('❌ Failed to read blob');
          throw new Error('Failed to read blob');
        };
        
        reader.readAsDataURL(blob);
        return;
      } catch (error) {
        console.warn('⚠️ Method 2 failed, trying Method 3:', error);
      }
    }

    // Method 3: Fallback - Try to open blob URL directly
    try {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000); // Keep URL for 1 minute
      
      console.log('✅ File opened in new tab (Method 3)');
    } catch (error) {
      console.error('❌ All download methods failed:', error);
      throw new Error('ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาลองอีกครั้งหรือใช้เบราว์เซอร์อื่น');
    }
  } catch (error) {
    console.error('❌ Download failed:', error);
    throw error;
  }
};

/**
 * Download text file (CSV, TXT, etc.)
 */
export const downloadTextFile = (
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void => {
  const blob = new Blob([content], { type: mimeType });
  downloadFile(blob, filename, mimeType);
};

/**
 * Download CSV file
 */
export const downloadCSV = (
  content: string,
  filename: string
): void => {
  // Add UTF-8 BOM for proper Thai character support
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename, 'text/csv');
};

/**
 * Download JSON file
 */
export const downloadJSON = (
  data: any,
  filename: string
): void => {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  downloadFile(blob, filename, 'application/json');
};

/**
 * Create download link element
 * (Legacy support - prefer using downloadFile)
 */
export const createDownloadLink = (
  blob: Blob,
  filename: string
): HTMLAnchorElement => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  return link;
};
