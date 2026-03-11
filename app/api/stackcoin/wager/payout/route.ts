import { NextRequest, NextResponse } from 'next/server';
import { getUserByDiscordId, sendPayment } from '@/lib/stackcoin';

export async function POST(request: NextRequest) {
  const { winner, hostDiscordId, guestDiscordId, amount } = await request.json();

  if (!winner || !hostDiscordId || !guestDiscordId || !amount) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const [hostUser, guestUser] = await Promise.all([
    getUserByDiscordId(hostDiscordId),
    getUserByDiscordId(guestDiscordId),
  ]);

  if (!hostUser || !guestUser) {
    return NextResponse.json({ error: 'Could not find users' }, { status: 404 });
  }

  if (winner === 'tie') {
    const label = 'blob.you — tie refund';
    await Promise.all([
      sendPayment(hostUser.id, amount, label),
      sendPayment(guestUser.id, amount, label),
    ]);
    return NextResponse.json({ ok: true });
  }

  const winnerUser = winner === 'host' ? hostUser : guestUser;
  await sendPayment(winnerUser.id, amount * 2, 'blob.you — wager win');
  return NextResponse.json({ ok: true });
}
