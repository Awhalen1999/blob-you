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
    console.error('[wager/refund] send failed:', res.status, text);
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // hostDiscordId and guestDiscordId are nullable — only refund the non-null ones
  const { hostDiscordId, guestDiscordId, amount } = body;

  if (!amount || (!hostDiscordId && !guestDiscordId)) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const label = `blob.you — wager refund`;
  const tasks: Promise<void>[] = [];

  if (hostDiscordId) {
    tasks.push(
      getStackcoinUserId(hostDiscordId).then(async (id) => {
        if (!id) { console.error('[wager/refund] host not found', hostDiscordId); return; }
        await sendPayment(id, amount, label);
        console.log('[wager/refund] refunded host', { hostDiscordId, amount });
      })
    );
  }

  if (guestDiscordId) {
    tasks.push(
      getStackcoinUserId(guestDiscordId).then(async (id) => {
        if (!id) { console.error('[wager/refund] guest not found', guestDiscordId); return; }
        await sendPayment(id, amount, label);
        console.log('[wager/refund] refunded guest', { guestDiscordId, amount });
      })
    );
  }

  await Promise.all(tasks);
  return NextResponse.json({ ok: true });
}
