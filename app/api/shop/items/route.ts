import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ownedItems } from '@/lib/db/schema';
import { SHOP_ITEMS } from '@/lib/shop/items';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);

  let ownedSet = new Set<string>();
  if (auth) {
    const owned = await db.select({ itemId: ownedItems.itemId })
      .from(ownedItems)
      .where(eq(ownedItems.userId, auth.uid));
    ownedSet = new Set(owned.map(r => r.itemId));
  }

  const items = SHOP_ITEMS.map(item => ({
    ...item,
    owned: ownedSet.has(item.id),
  }));

  return NextResponse.json({ items });
}
