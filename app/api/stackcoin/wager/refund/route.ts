import { NextRequest, NextResponse } from 'next/server';
import { getUserByDiscordId, sendPayment } from '@/lib/stackcoin';

export async function POST(request: NextRequest) {
  const { hostDiscordId, guestDiscordId, amount } = await request.json();

  if (!amount || (!hostDiscordId && !guestDiscordId)) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const label = 'blob.you — wager refund';
  const tasks: Promise<void>[] = [];

  if (hostDiscordId) {
    tasks.push(
      getUserByDiscordId(hostDiscordId).then(async (user) => {
        if (!user) { console.error('[wager/refund] host not found', hostDiscordId); return; }
        await sendPayment(user.id, amount, label);
      })
    );
  }

  if (guestDiscordId) {
    tasks.push(
      getUserByDiscordId(guestDiscordId).then(async (user) => {
        if (!user) { console.error('[wager/refund] guest not found', guestDiscordId); return; }
        await sendPayment(user.id, amount, label);
      })
    );
  }

  await Promise.all(tasks);
  return NextResponse.json({ ok: true });
}
