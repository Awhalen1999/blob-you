import { NextRequest, NextResponse } from 'next/server';

const STACKCOIN_API_URL = process.env.STACKCOIN_API_URL ?? 'https://stackcoin.world';

export async function GET(request: NextRequest) {
  const discordId = new URL(request.url).searchParams.get('discord_id');

  if (!discordId) {
    return NextResponse.json({ balance: null }, { status: 400 });
  }

  const url = `${STACKCOIN_API_URL}/api/users?discord_id=${discordId}`;
  console.log('[stackcoin] fetching:', url, '| token set:', !!process.env.STACKCOIN_BOT_TOKEN);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.STACKCOIN_BOT_TOKEN}` },
  });

  console.log('[stackcoin] response status:', res.status);

  if (!res.ok) {
    const text = await res.text();
    console.log('[stackcoin] error body:', text);
    return NextResponse.json({ balance: null });
  }

  const data = await res.json();
  console.log('[stackcoin] users:', JSON.stringify(data));
  const user = data?.users?.[0];

  if (!user) {
    return NextResponse.json({ balance: null });
  }

  return NextResponse.json({ balance: user.balance, username: user.username });
}
