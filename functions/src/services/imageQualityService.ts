/**
 * Image Quality Service
 * 
 * Pre-OCR image quality check to reduce fail rate
 * 
 * Checks:
 * - Image size (too small = likely blurry)
 * - Image dimensions (aspect ratio)
 * - File size (too large = may be corrupted)
 * - Basic image validation
 * 
 * Returns quality score and recommendations
 */

import sharp from 'sharp';

/**
 * Image quality result
 */
export interface ImageQualityResult {
  score: number; // 0-100
  passed: boolean;
  issues: string[];
  recommendations: string[];
  metadata: {
    width: number;
    height: number;
    sizeBytes: number;
    format: string;
  };
}

/**
 * Minimum quality thresholds
 */
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;
const MIN_SIZE_BYTES = 50 * 1024; // 50KB
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MIN_ASPECT_RATIO = 0.5; // width/height
const MAX_ASPECT_RATIO = 3.0;

/**
 * Check image quality before OCR
 * 
 * @param imageBuffer - Image buffer to check
 * @returns Quality result with score and recommendations
 */
export async function checkImageQuality(
  imageBuffer: Buffer
): Promise<ImageQualityResult> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const format = metadata.format || 'unknown';
    const sizeBytes = imageBuffer.length;
    
    // Check dimensions
    if (width < MIN_WIDTH) {
      issues.push(`ความกว้างภาพเล็กเกินไป (${width}px < ${MIN_WIDTH}px)`);
      recommendations.push('ติ๊ดๆ ถ่ายภาพให้ใหญ่ขึ้นหน่อยนะ');
      score -= 30;
    }
    
    if (height < MIN_HEIGHT) {
      issues.push(`ความสูงภาพเล็กเกินไป (${height}px < ${MIN_HEIGHT}px)`);
      recommendations.push('ติ๊ดๆ ถ่ายภาพให้ใหญ่ขึ้นหน่อยนะ');
      score -= 30;
    }
    
    // Check aspect ratio (slips are usually landscape)
    const aspectRatio = width / height;
    if (aspectRatio < MIN_ASPECT_RATIO || aspectRatio > MAX_ASPECT_RATIO) {
      issues.push(`สัดส่วนภาพไม่เหมาะสม (${aspectRatio.toFixed(2)})`);
      recommendations.push('ติ๊ดๆ ถ่ายภาพให้เต็มเฟรมหน่อยนะ');
      score -= 10;
    }
    
    // Check file size
    if (sizeBytes < MIN_SIZE_BYTES) {
      issues.push(`ไฟล์เล็กเกินไป (${(sizeBytes / 1024).toFixed(1)}KB < ${(MIN_SIZE_BYTES / 1024).toFixed(1)}KB)`);
      recommendations.push('โอ๊ะ! ภาพยังไม่ชัด ลองถ่ายใหม่หน่อยนะ');
      score -= 20;
    }
    
    if (sizeBytes > MAX_SIZE_BYTES) {
      issues.push(`ไฟล์ใหญ่เกินไป (${(sizeBytes / 1024 / 1024).toFixed(1)}MB > ${(MAX_SIZE_BYTES / 1024 / 1024).toFixed(1)}MB)`);
      recommendations.push('โอ๊ะ! ไฟล์อาจเสียหาย ส่งใหม่อีกครั้งได้เลย');
      score -= 15;
    }
    
    // Check format
    if (!['jpeg', 'jpg', 'png'].includes(format.toLowerCase())) {
      issues.push(`รูปแบบไฟล์ไม่รองรับ (${format})`);
      recommendations.push('ติ๊ดๆ ขอไฟล์ JPG หรือ PNG นะ');
      score -= 25;
    }
    
    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    const passed = score >= 50; // Pass if score >= 50
    
    if (!passed && issues.length === 0) {
      issues.push('คุณภาพภาพไม่เพียงพอ');
      recommendations.push('ติ๊ดๆ ถ่ายใหม่ให้ชัดๆ อีกครั้งนะ');
    }
    
    return {
      score,
      passed,
      issues,
      recommendations,
      metadata: {
        width,
        height,
        sizeBytes,
        format,
      },
    };
  } catch (error) {
    // If we can't read the image, it's definitely bad
    console.error(`[imageQualityService] Error checking image quality:`, error);
    return {
      score: 0,
      passed: false,
      issues: ['ไม่สามารถอ่านไฟล์ภาพได้'],
      recommendations: ['ส่งภาพใหม่ได้เลย'],
      metadata: {
        width: 0,
        height: 0,
        sizeBytes: imageBuffer.length,
        format: 'unknown',
      },
    };
  }
}

/**
 * Get quality warning message (if quality is low but not failed)
 */
export function getQualityWarningMessage(result: ImageQualityResult): string | null {
  if (result.passed && result.score < 70) {
    // Passed but quality is borderline
    return `⚠️ ภาพอาจไม่ชัดเจนพอ\n${result.recommendations.join('\n')}\n\nจะลองตรวจสอบให้ก่อนนะคะ`;
  }
  return null;
}
