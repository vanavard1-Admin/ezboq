/**
 * Mascot Asset Registry
 * 
 * Centralized registry for EzDOC mascot images with 3 characters:
 * - Dev (เด็กขี้เกียจ - lazy dev kid)
 * - Freelance (ฟรีแลนซ์เด็กขี้เกียจ)
 * - DokDok (ด๊อกๆ - robot cat clerk)
 * 
 * System randomly picks a sticker from the pool for variety.
 * 
 * LINE Image Message Requirements:
 * - originalContentUrl: HTTPS URL, max 10MB, JPEG/PNG
 * - previewImageUrl: HTTPS URL, max 1MB, JPEG/PNG (for preview)
 */

export type MascotKey = 'MASCOT_WAIT' | 'MASCOT_SUCCESS' | 'MASCOT_ERROR';

export type MascotCharacter = 'DEV' | 'FREELANCE' | 'DOKDOK';

interface StickerAsset {
    url: string;
    character: MascotCharacter;
    label: string; // Thai label for logging/debugging
}

/**
 * All available stickers organized by state
 * Each state has multiple stickers from different characters for variety
 */
const STICKER_POOL: Record<MascotKey, StickerAsset[]> = {
    MASCOT_WAIT: [
        // A1: Dev - รอแป๊ป..bot ทำอยู่
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FA1%E0%B8%A3%E0%B8%AD%E0%B9%81%E0%B8%9B%E0%B9%8A%E0%B8%9B..bot%20%E0%B8%97%E0%B8%B3%E0%B8%AD%E0%B8%A2%E0%B8%B9%E0%B9%88.png?alt=media&token=3152fa5b-1fb7-43b8-ad38-40a710ba46e5',
            character: 'DEV',
            label: 'รอแป๊ป..bot ทำอยู่',
        },
        // C2: DokDok - กำลังทำงับ
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FC2%E0%B8%81%E0%B8%B3%E0%B8%A5%E0%B8%B1%E0%B8%87%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B1%E0%B8%9A.png?alt=media&token=02963771-0b3c-4254-b28c-595eee9115d8',
            character: 'DOKDOK',
            label: 'กำลังทำงับ',
        },
        // B3: Freelance - พร้อมทำงานแล้วค่ะ
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FB3%E0%B8%9E%E0%B8%A3%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B9%81%E0%B8%A5%E0%B9%89%E0%B8%A7%E0%B8%84%E0%B9%88%E0%B8%B0.png?alt=media&token=7f9c52cd-c8a2-420c-ae27-6d108b1150c8',
            character: 'FREELANCE',
            label: 'พร้อมทำงานแล้วค่ะ',
        },
    ],
    MASCOT_SUCCESS: [
        // A2: Dev - สำเร็จแย้ว
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FA2%E0%B8%AA%E0%B8%B3%E0%B9%80%E0%B8%A3%E0%B9%87%E0%B8%88%E0%B9%81%E0%B8%A2%E0%B9%89%E0%B8%A7.png?alt=media&token=13dee0f4-48ba-4eeb-be30-ad985e100f25',
            character: 'DEV',
            label: 'สำเร็จแย้ว',
        },
        // A4: Dev - เอกสารพร้อมแล้ว
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FA4%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3%E0%B8%9E%E0%B8%A3%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B9%81%E0%B8%A5%E0%B9%89%E0%B8%A7.png?alt=media&token=83157810-6258-4c16-8304-7bdeb6eb1ecd',
            character: 'DEV',
            label: 'เอกสารพร้อมแล้ว',
        },
        // B1: Freelance - ใบเสนอราคาเสร็จแล้ว
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FB1%E0%B9%83%E0%B8%9A%E0%B9%80%E0%B8%AA%E0%B8%99%E0%B8%AD%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B9%80%E0%B8%AA%E0%B8%A3%E0%B9%87%E0%B8%88%E0%B9%81%E0%B8%A5%E0%B9%89%E0%B8%A7.png?alt=media&token=bd5defd9-f1da-41c1-9913-5ac8a23a33c0',
            character: 'FREELANCE',
            label: 'ใบเสนอราคาเสร็จแล้ว',
        },
        // B2: Freelance - ปิดงานได้
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FB2%E0%B8%9B%E0%B8%B4%E0%B8%94%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B9%84%E0%B8%94%E0%B9%89.png?alt=media&token=667802df-a16d-4f33-b706-d39e84a1add8',
            character: 'FREELANCE',
            label: 'ปิดงานได้',
        },
        // C1: DokDok - พร้อมแล้ว
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FC1%E0%B8%9E%E0%B8%A3%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B9%81%E0%B8%A5%E0%B9%89%E0%B8%A7.png?alt=media&token=b94f6400-5f82-4743-b25c-9eb6798dce2e',
            character: 'DOKDOK',
            label: 'พร้อมแล้ว',
        },
        // C3: DokDok - ขอบคุณที่ใช้บริการคั๊บ
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FC3%E0%B8%82%E0%B8%AD%E0%B8%9A%E0%B8%84%E0%B8%B8%E0%B8%93%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%84%E0%B8%B1%E0%B9%8A%E0%B8%9A.png?alt=media&token=c78440f4-df36-4c95-b331-0bf425eea642',
            character: 'DOKDOK',
            label: 'ขอบคุณที่ใช้บริการคั๊บ',
        },
        // C4: DokDok - ยินดีให้บริการกั๊บผม
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FC4%E0%B8%A2%E0%B8%B4%E0%B8%99%E0%B8%94%E0%B8%B5%E0%B9%83%E0%B8%AB%E0%B9%89%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%81%E0%B8%B1%E0%B9%8A%E0%B8%9A%E0%B8%9C%E0%B8%A1.png?alt=media&token=ea588e0e-8854-47b2-9aa8-0afd58ed23fc',
            character: 'DOKDOK',
            label: 'ยินดีให้บริการกั๊บผม',
        },
        // C5: DokDok - สำเร็จแย้ว
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FC5%E0%B8%AA%E0%B8%B3%E0%B9%80%E0%B8%A3%E0%B9%87%E0%B8%88%E0%B9%81%E0%B8%A2%E0%B9%89%E0%B8%A7.png?alt=media&token=77f11768-6659-41e6-88a2-9da636fc8dde',
            character: 'DOKDOK',
            label: 'สำเร็จแย้ว',
        },
    ],
    MASCOT_ERROR: [
        // C6: DokDok - ผิดพลาดลองใหม่น๊า
        {
            url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FC6%E0%B8%9C%E0%B8%B4%E0%B8%94%E0%B8%9E%E0%B8%A5%E0%B8%B2%E0%B8%94%E0%B8%A5%E0%B8%AD%E0%B8%87%E0%B9%83%E0%B8%AB%E0%B8%A1%E0%B9%88%E0%B8%99%E0%B9%8A%E0%B8%B2.png?alt=media&token=e12b62eb-57fc-4b4d-a035-b083c5dd0bc9',
            character: 'DOKDOK',
            label: 'ผิดพลาดลองใหม่น๊า',
        },
    ],
};

/**
 * Additional stickers for specific use cases (not random)
 */
export const SPECIAL_STICKERS = {
    // A2: Dev - อัตโนมัติคือทางออก (for automation-related messages)
    DEV_AUTOMATION: {
        url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/Mascot%2FNewSticker%2FA2%E0%B8%AD%E0%B8%B1%E0%B8%95%E0%B9%82%E0%B8%99%E0%B8%A1%E0%B8%B1%E0%B8%95%E0%B8%B4%E0%B8%84%E0%B8%B7%E0%B8%AD%E0%B8%97%E0%B8%B2%E0%B8%87%E0%B8%AD%E0%B8%AD%E0%B8%81.png?alt=media&token=825c081a-ec0e-4950-8d6b-bd3316cfe283',
        character: 'DEV' as MascotCharacter,
        label: 'อัตโนมัติคือทางออก',
    },
};

/**
 * Randomly pick a sticker from the pool for a given state.
 * This provides variety so users don't see the same sticker every time.
 * 
 * @param key - The mascot state key
 * @returns A randomly selected sticker asset
 */
function pickRandomSticker(key: MascotKey): StickerAsset {
    const pool = STICKER_POOL[key];
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
}

/**
 * Get mascot image URLs for a given asset key.
 * Randomly selects from available stickers for variety.
 * 
 * @param key - The mascot asset key (MASCOT_WAIT, MASCOT_SUCCESS, MASCOT_ERROR)
 * @returns Object with original and preview URLs, plus metadata
 */
export function getMascotUrls(key: MascotKey): {
    original: string;
    preview: string;
    character: MascotCharacter;
    label: string;
} {
    const sticker = pickRandomSticker(key);
    return {
        original: sticker.url,
        preview: sticker.url, // Same URL for both (stickers are already optimized)
        character: sticker.character,
        label: sticker.label,
    };
}

/**
 * Build a LINE image message object for the given mascot key.
 * Randomly picks a sticker from the available pool.
 * 
 * @param key - The mascot asset key
 * @returns LINE image message object ready to send
 */
export function buildMascotImageMessage(key: MascotKey): {
    type: 'image';
    originalContentUrl: string;
    previewImageUrl: string;
} {
    const urls = getMascotUrls(key);
    return {
        type: 'image',
        originalContentUrl: urls.original,
        previewImageUrl: urls.preview,
    };
}

/**
 * Build a LINE image message for a special sticker (not random).
 * 
 * @param stickerKey - Key from SPECIAL_STICKERS
 * @returns LINE image message object
 */
export function buildSpecialStickerMessage(stickerKey: keyof typeof SPECIAL_STICKERS): {
    type: 'image';
    originalContentUrl: string;
    previewImageUrl: string;
} {
    const sticker = SPECIAL_STICKERS[stickerKey];
    return {
        type: 'image',
        originalContentUrl: sticker.url,
        previewImageUrl: sticker.url,
    };
}
