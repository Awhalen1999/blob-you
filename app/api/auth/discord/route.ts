import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  // exchange code for discord access token
  const tokenRes = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${origin}/api/auth/discord`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Failed to exchange code' }, { status: 400 });
  }

  const { access_token } = await tokenRes.json();

  // fetch discord user profile
  const userRes = await fetch(DISCORD_USER_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch Discord user' }, { status: 400 });
  }

  const discordUser = await userRes.json();

  // mint firebase custom token using discord id as uid
  const firebaseToken = await adminAuth.createCustomToken(`discord:${discordUser.id}`, {
    discordId: discordUser.id,
    username: discordUser.username,
  });

  // redirect back to client with token
  const redirectUrl = new URL('/', origin);
  redirectUrl.searchParams.set('discord_token', firebaseToken);
  return NextResponse.redirect(redirectUrl);
}
