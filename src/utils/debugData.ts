export const seedDebugData = async () => { if (import.meta.env.DEV) console.debug('[dev] seedDebugData stub'); };
export const loadDebugData = async () => { if (import.meta.env.DEV) console.debug('[dev] loadDebugData stub'); return {}; };
export const primeDebugData = async () => { if (import.meta.env.DEV) console.debug('[dev] primeDebugData stub'); return {}; };
export default loadDebugData;
