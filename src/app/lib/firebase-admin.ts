import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let cachedApp: App | null = null;

const buildAdminConfig = () => {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    try {
      const serviceAccountJson = JSON.parse(Buffer.from(base64, 'base64').toString());
      if (typeof serviceAccountJson.project_id !== 'string' || !serviceAccountJson.project_id) {
        throw new Error('Service account object must contain a string "project_id" property.');
      }
      return {
        credential: cert(serviceAccountJson),
        projectId: serviceAccountJson.project_id as string,
      };
    } catch (e) {
      // Defer throwing until runtime usage for clearer error surfaces
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_BASE64: ' + (e as Error).message);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin env not configured (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)');
  }

  return {
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  };
};

export const getAdminApp = (): App => {
  if (cachedApp) return cachedApp;
  const apps = getApps();
  if (apps.length > 0) {
    cachedApp = apps[0]!;
    return cachedApp;
  }
  // Initialize lazily when actually used
  const config = buildAdminConfig();
  cachedApp = initializeApp(config);
  return cachedApp;
};

export const getDb = () => getFirestore(getAdminApp());
export const getAdminAuth = () => getAuth(getAdminApp());
export default getAdminApp;