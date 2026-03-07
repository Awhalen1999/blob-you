import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, 'base64').toString()
  );
  initializeApp({ credential: cert(serviceAccount) });
}

export const adminAuth = getAuth();
