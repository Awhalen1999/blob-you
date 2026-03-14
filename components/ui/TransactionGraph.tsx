"use client";

import { useMemo } from "react";
import type { StkTransaction } from "@/lib/stackcoin";

interface TransactionGraphProps {
  transactions: StkTransaction[];
  userId: number;
  currentBalance: number;
}

type BalancePoint = {
  time: Date;
  balance: number;
};

const PADDING = { top: 28, right: 16, bottom: 32, left: 52 };

export default function TransactionGraph({
  transactions,
  userId,
  currentBalance,
}: TransactionGraphProps) {
  const points = useMemo<BalancePoint[]>(() => {
    if (transactions.length === 0) return [];

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );

    let balance = currentBalance;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const tx = sorted[i];
      if (tx.from.id === userId) balance += tx.amount;
      else if (tx.to.id === userId) balance -= tx.amount;
    }

    const result: BalancePoint[] = [];
    for (const tx of sorted) {
      if (tx.from.id === userId) balance -= tx.amount;
      else if (tx.to.id === userId) balance += tx.amount;
      result.push({ time: new Date(tx.time), balance });
    }

    return result;
  }, [transactions, userId, currentBalance]);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-white/30 text-sm">
        No transaction history
      </div>
    );
  }

  const width = 420;
  const height = 180;
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const minBal = Math.min(...points.map((p) => p.balance));
  const maxBal = Math.max(...points.map((p) => p.balance));
  const balRange = maxBal - minBal || 1;

  const minTime = points[0].time.getTime();
  const maxTime = points[points.length - 1].time.getTime();
  const timeRange = maxTime - minTime || 1;

  const toX = (t: number) =>
    PADDING.left + ((t - minTime) / timeRange) * chartW;
  const toY = (b: number) =>
    PADDING.top + chartH - ((b - minBal) / balRange) * chartH;

  const linePoints = points
    .map((p) => `${toX(p.time.getTime())},${toY(p.balance)}`)
    .join(" ");

  const areaPath = [
    `M ${toX(points[0].time.getTime())},${toY(points[0].balance)}`,
    ...points
      .slice(1)
      .map((p) => `L ${toX(p.time.getTime())},${toY(p.balance)}`),
    `L ${toX(points[points.length - 1].time.getTime())},${PADDING.top + chartH}`,
    `L ${toX(points[0].time.getTime())},${PADDING.top + chartH}`,
    "Z",
  ].join(" ");

  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(minBal + (balRange * i) / yTicks),
  );

  const xLabelCount = Math.min(points.length, 5);
  const xIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i * (points.length - 1)) / (xLabelCount - 1 || 1)),
  );

  const formatDate = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
    >
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5675ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5675ff" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yLabels.map((val) => (
        <g key={val}>
          <line
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={toY(val)}
            y2={toY(val)}
            stroke="rgba(255,255,255,0.07)"
            strokeDasharray="3 3"
          />
          <text
            x={PADDING.left - 8}
            y={toY(val) + 4}
            textAnchor="end"
            fill="rgba(255,255,255,0.35)"
            fontSize="9"
            fontFamily="monospace"
          >
            {val.toLocaleString()}
          </text>
        </g>
      ))}

      {xIndices.map((idx) => {
        const p = points[idx];
        return (
          <text
            key={idx}
            x={toX(p.time.getTime())}
            y={height - 6}
            textAnchor="middle"
            fill="rgba(255,255,255,0.35)"
            fontSize="9"
            fontFamily="monospace"
          >
            {formatDate(p.time)}
          </text>
        );
      })}

      <path d={areaPath} fill="url(#areaFill)" />

      <polyline
        points={linePoints}
        fill="none"
        stroke="#5675ff"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
