import { NextRequest, NextResponse } from 'next/server';
import { getUserByDiscordId, createPaymentRequest, trackRequest } from '@/lib/stackcoin';

export async function POST(request: NextRequest) {
  const { hostDiscordId, guestDiscordId, amount, roomId } = await request.json();

  if (!hostDiscordId || !guestDiscordId || !amount || !roomId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const [hostUser, guestUser] = await Promise.all([
    getUserByDiscordId(hostDiscordId),
    getUserByDiscordId(guestDiscordId),
  ]);

  if (!hostUser || !guestUser) {
    return NextResponse.json({ error: 'Could not find StackCoin users' }, { status: 404 });
  }

  const label = `blob.you wager — ${amount} STK (accept within 5 min)`;

  const [hostRequestId, guestRequestId] = await Promise.all([
    createPaymentRequest(hostUser.id, amount, label),
    createPaymentRequest(guestUser.id, amount, label),
  ]);

  // Register with the gateway for real-time acceptance notifications
  trackRequest(hostRequestId, roomId, 'host');
  trackRequest(guestRequestId, roomId, 'guest');

  return NextResponse.json({ hostRequestId, guestRequestId });
}
