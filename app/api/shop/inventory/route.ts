import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ownedItems, equippedItems } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [owned, equipped] = await Promise.all([
    db.select({ itemId: ownedItems.itemId })
      .from(ownedItems)
      .where(eq(ownedItems.userId, auth.uid)),
    db.select({ slot: equippedItems.slot, itemId: equippedItems.itemId })
      .from(equippedItems)
      .where(eq(equippedItems.userId, auth.uid)),
  ]);

  const equippedMap: Record<string, string> = {};
  for (const row of equipped) {
    equippedMap[row.slot] = row.itemId;
  }

  return NextResponse.json({
    owned: owned.map(r => r.itemId),
    equipped: equippedMap,
  });
}
