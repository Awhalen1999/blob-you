import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';

export async function verifyAuth(request: NextRequest): Promise<{
  uid: string;
  discordId: string | null;
} | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const discordId = uid.startsWith('discord:') ? uid.split(':')[1] : null;
    return { uid, discordId };
  } catch {
    return null;
  }
}
