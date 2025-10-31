declare global { interface Window { createExampleAffiliateCodes?: () => Promise<void>; } }
if (import.meta.env.DEV) { window.createExampleAffiliateCodes = async () => console.log('[dev] createExampleAffiliateCodes stub'); }
export {};
