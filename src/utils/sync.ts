/**
 * 🔄 Sync Utility - บันทึกในเครื่อง → ซิงก์ขึ้นคลาวด์
 * 
 * ให้ UX ที่ดีโดยบอก user ว่าบันทึกในเครื่องแล้ว
 * แล้วค่อยซิงก์ขึ้นคลาวด์ในพื้นหลัง
 */

import { toast } from 'sonner';

export type SyncResult<T> = 
  | { ok: true; data: T; status: 'synced' }
  | { ok: false; error: any; status: 'local-only' };

/**
 * 🔄 บันทึกพร้อมซิงก์
 * 
 * แสดง toast ให้ user รู้ว่า:
 * 1. บันทึกในเครื่องแล้ว (ทันที)
 * 2. กำลังซิงก์ขึ้นคลาวด์
 * 3. ผลลัพธ์ (สำเร็จ/ล้มเหลว)
 * 
 * @example
 * const result = await saveWithSync(() => api.post('/profile', data));
 * if (result.ok) {
 *   setStatus('synced');
 * } else {
 *   setStatus('local-only');
 * }
 */
export async function saveWithSync<T>(
  work: () => Promise<T>,
  options?: {
    localMessage?: string;
    successMessage?: string;
    errorMessage?: string;
  }
): Promise<SyncResult<T>> {
  const {
    localMessage = 'บันทึกในเครื่องแล้ว • กำลังซิงก์...',
    successMessage = 'ซิงก์ขึ้นคลาวด์สำเร็จ ✓',
    errorMessage = 'ซิงก์ไม่สำเร็จ — เก็บไว้ในเครื่อง (Local only)',
  } = options || {};

  // แสดงว่าบันทึกในเครื่องแล้ว
  const toastId = toast.loading(localMessage);

  try {
    // ทำงาน sync
    const data = await work();
    
    // สำเร็จ
    toast.success(successMessage, { id: toastId });
    
    return { ok: true, data, status: 'synced' };
  } catch (error: any) {
    // ล้มเหลว - แต่ข้อมูลยังอยู่ในเครื่อง
    console.error('Sync failed:', error);
    
    toast.error(errorMessage, { 
      id: toastId,
      description: 'ข้อมูลยังอยู่ในเครื่อง คุณสามารถลองซิงก์ใหม่ได้',
      duration: 5000,
    });
    
    return { ok: false, error, status: 'local-only' };
  }
}

/**
 * 🔄 บันทึกเงียบๆ (ไม่แสดง toast)
 * 
 * ใช้สำหรับการบันทึกอัตโนมัติในพื้นหลัง
 */
export async function saveQuiet<T>(work: () => Promise<T>): Promise<SyncResult<T>> {
  try {
    const data = await work();
    return { ok: true, data, status: 'synced' };
  } catch (error: any) {
    console.error('Quiet sync failed:', error);
    return { ok: false, error, status: 'local-only' };
  }
}

/**
 * 🔄 ลองซิงก์ใหม่
 * 
 * ใช้สำหรับปุ่ม "ลองใหม่" เมื่อซิงก์ล้มเหลว
 */
export async function retrySyncWithToast<T>(
  work: () => Promise<T>
): Promise<SyncResult<T>> {
  return saveWithSync(work, {
    localMessage: 'กำลังซิงก์ใหม่...',
    successMessage: 'ซิงก์สำเร็จแล้ว ✓',
    errorMessage: 'ยังซิงก์ไม่สำเร็จ กรุณาลองใหม่ภายหลัง',
  });
}

/**
 * 🎨 สร้าง badge สำหรับแสดงสถานะ sync
 */
export function getSyncBadge(status: 'synced' | 'local-only' | 'syncing'): {
  text: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: string;
} {
  switch (status) {
    case 'synced':
      return {
        text: 'ซิงก์แล้ว',
        variant: 'default',
        icon: '✓',
      };
    case 'local-only':
      return {
        text: 'เก็บในเครื่อง',
        variant: 'outline',
        icon: '⚠',
      };
    case 'syncing':
      return {
        text: 'กำลังซิงก์...',
        variant: 'secondary',
        icon: '⏳',
      };
    default:
      return {
        text: 'ไม่ทราบสถานะ',
        variant: 'destructive',
        icon: '?',
      };
  }
}

/**
 * 📊 ตัวอย่างการใช้งานใน Component
 * 
 * @example
 * ```tsx
 * import { saveWithSync, getSyncBadge } from '@/utils/sync';
 * 
 * function ProfileEditor() {
 *   const [syncStatus, setSyncStatus] = useState<'synced' | 'local-only' | 'syncing'>('synced');
 * 
 *   const handleSave = async () => {
 *     setSyncStatus('syncing');
 *     
 *     const result = await saveWithSync(() => 
 *       api.put('/profile', formData)
 *     );
 *     
 *     setSyncStatus(result.status);
 *   };
 * 
 *   const badge = getSyncBadge(syncStatus);
 * 
 *   return (
 *     <div>
 *       <Badge variant={badge.variant}>
 *         {badge.icon} {badge.text}
 *       </Badge>
 *       <Button onClick={handleSave}>บันทึก</Button>
 *     </div>
 *   );
 * }
 * ```
 */
