'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/hooks/useShop';
import type { ItemCategory } from '@/lib/shop/items';
import ShopItemCard from '@/components/shop/ShopItemCard';
import PurchaseModal from '@/components/shop/PurchaseModal';
import type { ShopItemWithOwnership } from '@/hooks/useShop';

const CATEGORIES: { label: string; value: ItemCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Trails', value: 'trail' },
  { label: 'Glows', value: 'glow' },
  { label: 'Particles', value: 'particle' },
  { label: 'Backgrounds', value: 'background' },
];

export default function ShopPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, equipped, loading, purchasing, purchase, equip, unequip } = useShop();
  const [filter, setFilter] = useState<ItemCategory | 'all'>('all');
  const [buyingItem, setBuyingItem] = useState<ShopItemWithOwnership | null>(null);

  if (authLoading || loading) {
    return (
      <div className="tile-bg">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!user || !user.uid.startsWith('discord:')) {
    return (
      <div className="tile-bg">
        <div className="transparent-bg rounded-sm border border-white/20 p-lg text-center max-w-sm mx-4">
          <p className="text-white font-bold mb-md">Discord login required</p>
          <p className="text-white/40 text-sm mb-md">Sign in with Discord to access the shop.</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm font-bold uppercase">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);

  return (
    <div className="tile-bg !items-start !justify-start">
      <div className="w-full max-w-2xl mx-auto p-lg">
        {/* Header */}
        <div className="flex items-center gap-md mb-lg">
          <Link href="/" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white font-bold text-2xl uppercase tracking-wide">Shop</h1>
        </div>

        {/* Category tabs */}
        <div className="flex gap-xs mb-lg overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`
                px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wide transition-colors shrink-0
                ${filter === cat.value
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'text-white/40 border border-white/10 hover:text-white/60'
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {filtered.map(item => (
            <ShopItemCard
              key={item.id}
              item={item}
              equipped={equipped}
              purchasing={purchasing}
              onBuy={(id) => setBuyingItem(items.find(i => i.id === id) ?? null)}
              onEquip={equip}
              onUnequip={unequip}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-white/30 text-sm text-center mt-xl">No items in this category yet.</p>
        )}
      </div>

      {/* Purchase modal */}
      {buyingItem && (
        <PurchaseModal
          item={buyingItem}
          onConfirm={() => purchase(buyingItem.id)}
          onClose={() => setBuyingItem(null)}
        />
      )}
    </div>
  );
}
