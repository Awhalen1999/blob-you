"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { X, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import TransactionGraph from "./TransactionGraph";
import type { StkTransaction } from "@/lib/stackcoin";

interface StackCoinPopupProps {
  discordId: string;
  currentBalance: number;
  onClose: () => void;
}

export default function StackCoinPopup({
  discordId,
  currentBalance,
  onClose,
}: StackCoinPopupProps) {
  const [transactions, setTransactions] = useState<StkTransaction[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/stackcoin/transactions?discord_id=${discordId}`)
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data.transactions ?? []);
        setUserId(data.userId ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [discordId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
  const recent = sorted.slice(0, 5);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="transparent-bg relative w-full max-w-lg mx-4 rounded-sm border border-white/20 p-lg max-h-[85vh] overflow-y-auto scrollbar-hide">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Balance header */}
        <div className="text-center mb-md">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-1">
            Balance
          </p>
          <div className="flex items-center justify-center gap-2">
            <Image src="/stack-coin.png" alt="STK" width={28} height={28} />
            <span className="text-3xl font-bold text-white font-mono">
              {currentBalance.toLocaleString()}
            </span>
            <span className="text-white/50 text-lg font-bold">STK</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : (
          <>
            {/* Graph */}
            {userId !== null && (
              <div className="bg-black/30 rounded-sm border border-white/10 p-3 mb-md">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
                  Balance History
                </p>
                <TransactionGraph
                  transactions={transactions}
                  userId={userId}
                  currentBalance={currentBalance}
                />
              </div>
            )}

            {/* Recent transactions */}
            {recent.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
                  Recent Transactions
                </p>
                <div className="flex flex-col gap-1.5">
                  {recent.map((tx, i) => {
                    const isSent = tx.from.id === userId;
                    return (
                      <div
                        key={`${tx.id}-${i}`}
                        className="flex items-center gap-3 bg-black/20 rounded px-3 py-2 border border-white/5"
                      >
                        <div
                          className={`shrink-0 rounded-full p-1 ${isSent ? "bg-red-500/20" : "bg-green-500/20"}`}
                        >
                          {isSent ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {isSent
                              ? `To ${tx.to.username ?? "Unknown"}`
                              : `From ${tx.from.username ?? "Unknown"}`}
                          </p>
                          {tx.label && (
                            <p className="text-xs text-white/30 truncate">
                              {tx.label}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-bold font-mono ${isSent ? "text-red-400" : "text-green-400"}`}
                          >
                            {isSent ? "-" : "+"}
                            {tx.amount}
                          </p>
                          <p className="text-[10px] text-white/25">
                            {formatTime(tx.time)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
