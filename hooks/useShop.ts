'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { ShopItem, ItemCategory } from '@/lib/shop/items';

export type ShopItemWithOwnership = ShopItem & { owned: boolean };

type Equipped = Partial<Record<ItemCategory, string>>;

interface ShopData {
  items: ShopItemWithOwnership[];
  equipped: Equipped;
}

export function useShop() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.uid ?? null;

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const [purchasing, setPurchasing] = useState<string | null>(null);

  const { data, isLoading: loading } = useQuery<ShopData>({
    queryKey: ['shopData', uid],
    queryFn: async () => {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [itemsRes, invRes] = await Promise.all([
        fetch('/api/shop/items', { headers }),
        token ? fetch('/api/shop/inventory', { headers }) : Promise.resolve(null),
      ]);

      const itemsData = await itemsRes.json();
      const invData = invRes ? await invRes.json() : null;

      return {
        items: itemsData.items ?? [],
        equipped: invData?.equipped ?? {},
      };
    },
    enabled: !!uid,
    staleTime: 30_000,
  });

  const items = data?.items ?? [];
  const equipped = data?.equipped ?? {};

  const invalidateShop = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shopData', uid] });
  }, [queryClient, uid]);

  const purchase = useCallback(async (itemId: string) => {
    const token = await getToken();
    if (!token) return { success: false, reason: 'not_authenticated' };

    setPurchasing(itemId);
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const result = await res.json();

      if (result.success) invalidateShop();

      return result;
    } catch {
      return { success: false };
    } finally {
      setPurchasing(null);
    }
  }, [getToken, invalidateShop]);

  const equip = useCallback(async (itemId: string) => {
    const token = await getToken();
    if (!token) return;

    await fetch('/api/shop/equip', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action: 'equip' }),
    });

    invalidateShop();
  }, [getToken, invalidateShop]);

  const unequip = useCallback(async (itemId: string) => {
    const token = await getToken();
    if (!token) return;

    await fetch('/api/shop/equip', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action: 'unequip' }),
    });

    invalidateShop();
  }, [getToken, invalidateShop]);

  return { items, equipped, loading, purchasing, purchase, equip, unequip };
}
