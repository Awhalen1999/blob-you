import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ownedItems, equippedItems } from '@/lib/db/schema';
import { SHOP_ITEMS_MAP } from '@/lib/shop/items';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { itemId, action } = body as { itemId: string; action: 'equip' | 'unequip' };

  const item = SHOP_ITEMS_MAP.get(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (action === 'equip') {
    const [owned] = await db.select()
      .from(ownedItems)
      .where(and(eq(ownedItems.userId, auth.uid), eq(ownedItems.itemId, itemId)));

    if (!owned) return NextResponse.json({ error: 'Item not owned' }, { status: 403 });

    await db.insert(equippedItems)
      .values({ userId: auth.uid, slot: item.category, itemId })
      .onConflictDoUpdate({
        target: [equippedItems.userId, equippedItems.slot],
        set: { itemId },
      });
  } else {
    await db.delete(equippedItems)
      .where(and(eq(equippedItems.userId, auth.uid), eq(equippedItems.slot, item.category)));
  }

  return NextResponse.json({ success: true });
}
