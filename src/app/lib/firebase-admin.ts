import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin SDK configuration with base64 encoded service account
const getFirebaseAdminConfig = () => {
  // Check if we have base64 encoded service account
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const serviceAccountJson = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString()
      );
      
      return {
        credential: cert(serviceAccountJson),
        projectId: serviceAccountJson.project_id,
      };
    } catch (error) {
      console.error('Error parsing base64 service account:', error);
      throw new Error('Invalid base64 encoded service account');
    }
  }
  
  // Fallback to individual environment variables
  return {
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  };
};

// Initialize Firebase Admin
const app = getApps().length === 0 ? initializeApp(getFirebaseAdminConfig()) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;