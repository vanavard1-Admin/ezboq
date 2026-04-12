'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ScrollToTop() {
    const pathname = usePathname();

    useEffect(() => {
        // Scroll to top when route changes
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);

    return null;
}
