import { pgTable, text, timestamp, primaryKey, pgEnum } from 'drizzle-orm/pg-core';

export const itemSlot = pgEnum('item_slot', ['trail', 'glow', 'particle', 'background']);

export const ownedItems = pgTable('owned_items', {
  userId: text('user_id').notNull(),
  itemId: text('item_id').notNull(),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.itemId] }),
]);

export const equippedItems = pgTable('equipped_items', {
  userId: text('user_id').notNull(),
  slot: itemSlot('slot').notNull(),
  itemId: text('item_id').notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.slot] }),
]);
