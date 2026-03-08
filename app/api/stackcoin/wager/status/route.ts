import { NextRequest, NextResponse } from 'next/server';

const STACKCOIN_API_URL = process.env.STACKCOIN_API_URL ?? 'https://stackcoin.world';
const BOT_TOKEN = process.env.STACKCOIN_BOT_TOKEN!;

async function isRequestAccepted(requestId: string): Promise<boolean> {
  const res = await fetch(`${STACKCOIN_API_URL}/api/request/${requestId}`, {
    headers: { Authorization: `Bearer ${BOT_TOKEN}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  console.log('[wager/status] request', requestId, 'status:', data?.status);
  return data?.status === 'accepted';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hostReqId = searchParams.get('hostReqId');
  const guestReqId = searchParams.get('guestReqId');

  if (!hostReqId || !guestReqId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const [hostAccepted, guestAccepted] = await Promise.all([
    isRequestAccepted(hostReqId),
    isRequestAccepted(guestReqId),
  ]);

  return NextResponse.json({ hostAccepted, guestAccepted });
}
