'use client';

import Button from '@/components/ui/Button';
import type { ShopItemWithOwnership } from '@/hooks/useShop';
import type { ItemCategory } from '@/lib/shop/items';

interface ShopItemCardProps {
  item: ShopItemWithOwnership;
  equipped: Partial<Record<ItemCategory, string>>;
  purchasing: string | null;
  onBuy: (itemId: string) => void;
  onEquip: (itemId: string) => void;
  onUnequip: (itemId: string) => void;
}

export default function ShopItemCard({
  item,
  equipped,
  purchasing,
  onBuy,
  onEquip,
  onUnequip,
}: ShopItemCardProps) {
  const isEquipped = equipped[item.category] === item.id;
  const isPurchasing = purchasing === item.id;

  return (
    <div className="transparent-bg rounded-sm border border-white/20 p-md flex flex-col gap-sm">
      <div className="flex items-center gap-sm">
        <span className="text-2xl">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{item.name}</p>
          <p className="text-white/40 text-xs truncate">{item.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-white/60 text-xs font-mono font-bold">{item.price} STK</span>

        {!item.owned ? (
          <Button
            size="sm"
            variant="primary"
            loading={isPurchasing}
            disabled={isPurchasing}
            onClick={() => onBuy(item.id)}
          >
            Buy
          </Button>
        ) : isEquipped ? (
          <Button size="sm" variant="danger" onClick={() => onUnequip(item.id)}>
            Unequip
          </Button>
        ) : (
          <Button size="sm" variant="success" onClick={() => onEquip(item.id)}>
            Equip
          </Button>
        )}
      </div>
    </div>
  );
}
