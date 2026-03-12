"use client";

import { useState } from "react";
import Image from "next/image";
import StackCoinPopup from "./StackCoinPopup";

interface CoinBadgeProps {
  balance: number;
  discordId: string;
}

export default function CoinBadge({ balance, discordId }: CoinBadgeProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer"
      >
        <Image
          src="/stack-coin.png"
          alt="STK"
          width={20}
          height={20}
          className="drop-shadow-[0_0_4px_rgba(86,117,255,0.6)]"
        />
        <span>{balance.toLocaleString()} STK</span>
      </button>

      {open && (
        <StackCoinPopup
          discordId={discordId}
          currentBalance={balance}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
