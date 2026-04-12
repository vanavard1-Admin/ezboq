"use client";

import { useEffect } from "react";

export default function UnregisterServiceWorkers() {
  useEffect(() => {
    // Run only in browsers that support service workers
    if (typeof window === "undefined" || !('serviceWorker' in navigator)) return;

    // Try to unregister any service worker registrations. This is a one-time
    // safety measure for clients that may have an out-of-date Service Worker
    // serving old bundles. We do this unconditionally in production builds.
    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        // Swallow errors to avoid noisy logs in production
      }
    })();
  }, []);

  return null;
}
