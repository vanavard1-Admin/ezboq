import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';
import { app } from '@ezboq/shared/utils/firebase';

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalAutoDetectLongPolling: true,
});
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-southeast1');

// Analytics + Performance Monitoring (production only)
if (import.meta.env.PROD) {
  isSupported().then((yes) => {
    if (yes) getAnalytics(app);
  });
  getPerformance(app);
}
