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

async function sendPayment(recipientStackcoinId: string, amount: number, label: string): Promise<boolean> {
  const res = await fetch(`${STACKCOIN_API_URL}/api/user/${recipientStackcoinId}/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, label }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[wager/payout] send failed:', res.status, text);
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { winner, hostDiscordId, guestDiscordId, amount } = body;

  if (!winner || !hostDiscordId || !guestDiscordId || !amount) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  console.log('[wager/payout] paying out', { winner, amount });

  if (winner === 'tie') {
    // Refund both players their stake
    const [hostId, guestId] = await Promise.all([
      getStackcoinUserId(hostDiscordId),
      getStackcoinUserId(guestDiscordId),
    ]);
    if (!hostId || !guestId) {
      return NextResponse.json({ error: 'Could not find users' }, { status: 404 });
    }
    const label = `blob.you — tie refund`;
    await Promise.all([
      sendPayment(hostId, amount, label),
      sendPayment(guestId, amount, label),
    ]);
    console.log('[wager/payout] tie refund sent');
    return NextResponse.json({ ok: true });
  }

  // Winner takes both stakes (2x)
  const winnerDiscordId = winner === 'host' ? hostDiscordId : guestDiscordId;
  const winnerId = await getStackcoinUserId(winnerDiscordId);
  if (!winnerId) {
    return NextResponse.json({ error: 'Could not find winner' }, { status: 404 });
  }

  const label = `blob.you — wager win`;
  const ok = await sendPayment(winnerId, amount * 2, label);
  if (!ok) {
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }

  console.log('[wager/payout] winner paid', { winner, amount: amount * 2 });
  return NextResponse.json({ ok: true });
}
