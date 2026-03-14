export type ItemCategory = 'trail' | 'glow' | 'particle' | 'background';

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ItemCategory;
  icon: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'trail_1', name: 'Trail', description: 'Placeholder trail effect', price: 10, category: 'trail', icon: '✨' },
  { id: 'glow_1', name: 'Glow', description: 'Placeholder glow effect', price: 10, category: 'glow', icon: '💡' },
  { id: 'particle_1', name: 'Particles', description: 'Placeholder contact particles', price: 10, category: 'particle', icon: '⚡' },
  { id: 'background_1', name: 'Background', description: 'Placeholder background', price: 10, category: 'background', icon: '🌌' },
];

export const SHOP_ITEMS_MAP = new Map(SHOP_ITEMS.map(item => [item.id, item]));
