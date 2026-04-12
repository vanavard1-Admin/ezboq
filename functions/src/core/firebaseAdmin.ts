import * as admin from 'firebase-admin';

let firestoreInstance: FirebaseFirestore.Firestore | null = null;

export function initAdmin(): admin.app.App {
  if (admin.apps.length) {
    return admin.app();
  }
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credsPath) {
    // Use explicit service account if provided.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(credsPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Fall back to ADC / default credentials.
    admin.initializeApp();
  }
  return admin.app();
}

export function getDb(): FirebaseFirestore.Firestore {
  initAdmin();
  if (!firestoreInstance) {
    firestoreInstance = admin.firestore();
  }
  return firestoreInstance;
}
