import { NextRequest, NextResponse } from 'next/server';

const STACKCOIN_API_URL = process.env.STACKCOIN_API_URL ?? 'https://stackcoin.world';
const BOT_TOKEN = process.env.STACKCOIN_BOT_TOKEN!;

async function getStackcoinUserId(discordId: string): Promise<string | null> {
  const res = await fetch(`${STACKCOIN_API_URL}/api/users?discord_id=${discordId}`, {
    headers: { Authorization: `Bearer ${BOT_TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.users?.[0]?.id ?? null;
}

async function createPaymentRequest(stackcoinUserId: string, amount: number, label: string): Promise<string | null> {
  const res = await fetch(`${STACKCOIN_API_URL}/api/user/${stackcoinUserId}/request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, label }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[wager/create] request failed:', res.status, text);
    return null;
  }
  const data = await res.json();
  console.log('[wager/create] request response:', JSON.stringify(data));
  // API returns request_id
  return data?.request_id ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { hostDiscordId, guestDiscordId, amount } = body;

  if (!hostDiscordId || !guestDiscordId || !amount) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  console.log('[wager/create] looking up users', { hostDiscordId, guestDiscordId, amount });

  const [hostStackcoinId, guestStackcoinId] = await Promise.all([
    getStackcoinUserId(hostDiscordId),
    getStackcoinUserId(guestDiscordId),
  ]);

  if (!hostStackcoinId || !guestStackcoinId) {
    console.error('[wager/create] could not find stackcoin users', { hostStackcoinId, guestStackcoinId });
    return NextResponse.json({ error: 'Could not find StackCoin users' }, { status: 404 });
  }

  const label = `blob.you wager — ${amount} STK (accept within 5 min)`;

  const [hostRequestId, guestRequestId] = await Promise.all([
    createPaymentRequest(hostStackcoinId, amount, label),
    createPaymentRequest(guestStackcoinId, amount, label),
  ]);

  if (!hostRequestId || !guestRequestId) {
    return NextResponse.json({ error: 'Failed to create payment requests' }, { status: 500 });
  }

  console.log('[wager/create] created requests', { hostRequestId, guestRequestId });
  return NextResponse.json({ hostRequestId, guestRequestId });
}
