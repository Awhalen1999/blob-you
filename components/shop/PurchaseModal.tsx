'use client';

import { useState, useRef } from 'react';
import { X, Loader2, Check, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { ShopItem } from '@/lib/shop/items';

type PurchaseState = 'confirm' | 'waiting' | 'success' | 'denied' | 'timeout';

interface PurchaseModalProps {
  item: ShopItem;
  onConfirm: () => Promise<{ success: boolean; reason?: string }>;
  onClose: () => void;
}

export default function PurchaseModal({ item, onConfirm, onClose }: PurchaseModalProps) {
  const [state, setState] = useState<PurchaseState>('confirm');
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleConfirm = async () => {
    setState('waiting');
    const result = await onConfirm();
    if (result.success) {
      setState('success');
    } else if (result.reason === 'denied') {
      setState('denied');
    } else {
      setState('timeout');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current && state !== 'waiting') onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="transparent-bg relative w-full max-w-sm mx-4 rounded-sm border border-white/20 p-lg">
        {state !== 'waiting' && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center">
          <span className="text-4xl block mb-sm">{item.icon}</span>
          <p className="text-white font-bold text-lg">{item.name}</p>
          <p className="text-white/40 text-sm mb-md">{item.description}</p>

          {state === 'confirm' && (
            <>
              <p className="text-white/60 text-sm mb-md">
                Purchase for <span className="text-white font-bold font-mono">{item.price} STK</span>?
              </p>
              <div className="flex gap-sm justify-center">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
              </div>
            </>
          )}

          {state === 'waiting' && (
            <div className="py-md">
              <Loader2 className="w-8 h-8 animate-spin text-white/40 mx-auto mb-sm" />
              <p className="text-white/60 text-sm">Waiting for payment...</p>
              <p className="text-white/30 text-xs mt-xs">Accept the request from StackCoin on Discord</p>
            </div>
          )}

          {state === 'success' && (
            <div className="py-md">
              <Check className="w-8 h-8 text-green-400 mx-auto mb-sm" />
              <p className="text-green-400 font-bold">Purchased!</p>
              <Button variant="primary" className="mt-md" onClick={onClose}>Done</Button>
            </div>
          )}

          {(state === 'denied' || state === 'timeout') && (
            <div className="py-md">
              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-sm" />
              <p className="text-red-400 font-bold">
                {state === 'denied' ? 'Payment Denied' : 'Payment Timed Out'}
              </p>
              <Button variant="secondary" className="mt-md" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
