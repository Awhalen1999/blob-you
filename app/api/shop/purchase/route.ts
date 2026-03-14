import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ownedItems } from '@/lib/db/schema';
import { SHOP_ITEMS_MAP } from '@/lib/shop/items';
import { verifyAuth } from '@/lib/auth';
import { getStkClient, getUserByDiscordId } from '@/lib/stackcoin';

export const maxDuration = 60;

const MAX_POLLS = 30;
const POLL_INTERVAL_MS = 2000;

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!auth.discordId) return NextResponse.json({ error: 'Discord account required' }, { status: 403 });

  const body = await request.json();
  const { itemId } = body as { itemId: string };

  const item = SHOP_ITEMS_MAP.get(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const [existing] = await db.select()
    .from(ownedItems)
    .where(and(eq(ownedItems.userId, auth.uid), eq(ownedItems.itemId, itemId)));

  if (existing) return NextResponse.json({ error: 'Already owned' }, { status: 409 });

  const stkUser = await getUserByDiscordId(auth.discordId);
  if (!stkUser) return NextResponse.json({ error: 'StackCoin account not found' }, { status: 404 });

  const client = getStkClient();
  const label = `blob.you shop — ${item.name}`;

  let requestId: number;
  try {
    const res = await client.createRequest(stkUser.id, item.price, { label });
    requestId = res.request_id;
  } catch (err) {
    console.error('[shop/purchase] createRequest error:', err);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    try {
      const req = await client.getRequest(requestId);

      if (req.status === 'accepted') {
        await db.insert(ownedItems)
          .values({ userId: auth.uid, itemId })
          .onConflictDoNothing();

        return NextResponse.json({ success: true, itemId });
      }

      if (req.status === 'denied') {
        return NextResponse.json({ success: false, reason: 'denied' });
      }
    } catch (err) {
      console.error('[shop/purchase] poll error:', err);
    }
  }

  return NextResponse.json({ success: false, reason: 'timeout' });
}
