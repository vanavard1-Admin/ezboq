import { getApp, getApps, initializeApp } from 'firebase/app';

// Shared Firebase configuration for EzBOQ + EzDoc monorepo
// This config can be used by both apps/web and apps/portal

export const firebaseConfig = {
  apiKey: 'AIzaSyAFaOY5ennTgoiRXSwIA3ipfKbhGrG85gs',
  authDomain: 'ezdoc-v1-th.firebaseapp.com',
  projectId: 'ezdoc-v1-th',
  storageBucket: 'ezdoc-v1-th.firebasestorage.app',
  messagingSenderId: '498553770750',
  appId: '1:498553770750:web:20a4f8186df5cb05cf4baf',
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Environment type for better type safety
export type FirebaseEnvironment = 'development' | 'production';

// Helper function to get project-specific settings
export const getFirebaseEnvironment = (): FirebaseEnvironment => {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
};
