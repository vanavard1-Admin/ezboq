import { humanFirstUx } from './humanFirstUx';
import { minimalFirstUx } from './minimalFirstUx';
import type { UxVariant } from './interface';


// Simple consistent hash for A/B testing
// Returns an integer
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

export function getUxVariant(userId: string): UxVariant {
    // Deterministic assignment based on userId hash
    // Even hash -> Human First (Variant A) - sticking to existing behavior mostly
    // Odd hash -> Minimal First (Variant B)
    // Or user preference can override this in future

    const hash = hashCode(userId);
    return hash % 2 === 0 ? humanFirstUx : minimalFirstUx;
}

export * from './interface';
