/**
 * 🖼️ Image Compression Utility
 * Compresses images to reduce file size for storage
 * Target: 300-500KB Base64 for optimal performance
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  targetSizeKB?: number;
  quality?: number;
}

/**
 * Compress image file to Base64 with target size
 * 
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns Promise<string> - Compressed Base64 string
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    targetSizeKB = 400,
    quality = 0.85
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          // Create canvas and resize
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try different quality levels to meet size target
          let currentQuality = quality;
          let compressed = canvas.toDataURL('image/jpeg', currentQuality);
          
          // Calculate actual Base64 size in KB
          const calculateSizeKB = (base64: string) => {
            // Remove data URL prefix
            const base64Data = base64.split(',')[1] || base64;
            // Base64 encoding adds ~33% overhead (4 chars for 3 bytes)
            return (base64Data.length * 0.75) / 1024;
          };
          
          let currentSizeKB = calculateSizeKB(compressed);
          const originalSizeKB = currentSizeKB;
          
          // Binary search for optimal quality
          if (currentSizeKB > targetSizeKB) {
            let minQuality = 0.1;
            let maxQuality = currentQuality;
            let attempts = 0;
            const maxAttempts = 8;
            
            while (attempts < maxAttempts && Math.abs(currentSizeKB - targetSizeKB) > 20) {
              currentQuality = (minQuality + maxQuality) / 2;
              compressed = canvas.toDataURL('image/jpeg', currentQuality);
              currentSizeKB = calculateSizeKB(compressed);
              
              if (currentSizeKB > targetSizeKB) {
                maxQuality = currentQuality;
              } else {
                minQuality = currentQuality;
              }
              
              attempts++;
            }
          }
          
          console.log(
            `🖼️ Image compressed: ${originalSizeKB.toFixed(0)}KB → ${currentSizeKB.toFixed(0)}KB ` +
            `(${width}x${height}, quality: ${(currentQuality * 100).toFixed(0)}%)`
          );
          
          resolve(compressed);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Get recommended compression options based on image type
 * 
 * @param imageType - Type of image (avatar, logo, qrCode, signature)
 * @returns CompressionOptions
 */
export function getCompressionOptions(
  imageType: 'avatar' | 'logo' | 'qrCode' | 'signature'
): CompressionOptions {
  switch (imageType) {
    case 'avatar':
      return {
        maxWidth: 400,
        maxHeight: 400,
        targetSizeKB: 250, // Smaller for profile pictures
        quality: 0.80
      };
    
    case 'logo':
      return {
        maxWidth: 600,
        maxHeight: 600,
        targetSizeKB: 350,
        quality: 0.85
      };
    
    case 'qrCode':
      return {
        maxWidth: 400,
        maxHeight: 400,
        targetSizeKB: 120, // Reduced from 300KB → 120KB for faster saves
        quality: 0.88 // Optimized quality for QR codes
      };
    
    case 'signature':
      return {
        maxWidth: 600,
        maxHeight: 300,
        targetSizeKB: 250,
        quality: 0.85
      };
    
    default:
      return {
        maxWidth: 800,
        maxHeight: 800,
        targetSizeKB: 400,
        quality: 0.85
      };
  }
}

/**
 * Validate image file before compression
 * 
 * @param file - File to validate
 * @returns Object with validation result
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, GIF, WebP)'
    };
  }
  
  // Check original file size (max 10MB before compression)
  const maxSizeMB = 10;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `ไฟล์ใหญ่เกิน ${maxSizeMB}MB กรุณาเลือกไฟล์ที่เล็กกว่า`
    };
  }
  
  return { valid: true };
}
