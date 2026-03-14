'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ShopItem, ItemCategory } from '@/lib/shop/items';

export type ShopItemWithOwnership = ShopItem & { owned: boolean };

type Equipped = Partial<Record<ItemCategory, string>>;

export function useShop() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItemWithOwnership[]>([]);
  const [equipped, setEquipped] = useState<Equipped>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const fetchData = useCallback(async () => {
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const [itemsRes, invRes] = await Promise.all([
      fetch('/api/shop/items', { headers }),
      token ? fetch('/api/shop/inventory', { headers }) : Promise.resolve(null),
    ]);

    const itemsData = await itemsRes.json();
    setItems(itemsData.items ?? []);

    if (invRes) {
      const invData = await invRes.json();
      setEquipped(invData.equipped ?? {});
    }

    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      const data = await res.json();

      if (data.success) {
        await fetchData();
      }

      return data;
    } finally {
      setPurchasing(null);
    }
  }, [getToken, fetchData]);

  const equip = useCallback(async (itemId: string) => {
    const token = await getToken();
    if (!token) return;

    await fetch('/api/shop/equip', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action: 'equip' }),
    });

    await fetchData();
  }, [getToken, fetchData]);

  const unequip = useCallback(async (itemId: string) => {
    const token = await getToken();
    if (!token) return;

    await fetch('/api/shop/equip', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action: 'unequip' }),
    });

    await fetchData();
  }, [getToken, fetchData]);

  return { items, equipped, loading, purchasing, purchase, equip, unequip };
}
