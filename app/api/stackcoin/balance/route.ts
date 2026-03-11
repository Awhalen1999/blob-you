import { NextRequest, NextResponse } from 'next/server';
import { getUserByDiscordId } from '@/lib/stackcoin';

export async function GET(request: NextRequest) {
  const discordId = new URL(request.url).searchParams.get('discord_id');
  if (!discordId) {
    return NextResponse.json({ balance: null }, { status: 400 });
  }

  try {
    const user = await getUserByDiscordId(discordId);
    if (!user) return NextResponse.json({ balance: null });
    return NextResponse.json({ balance: user.balance, username: user.username });
  } catch (err) {
    console.error('[stackcoin/balance] error:', err);
    return NextResponse.json({ balance: null });
  }
}
