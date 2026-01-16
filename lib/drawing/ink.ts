import type { Stroke } from '@/types/game';

export function calculateInkUsed(stroke: Stroke): number {
  if (stroke.points.length < 2) return 0;
  
  let totalLength = 0;
  for (let i = 1; i < stroke.points.length; i++) {
    const dx = stroke.points[i].x - stroke.points[i - 1].x;
    const dy = stroke.points[i].y - stroke.points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }
  
  // Normalize to percentage (adjust divisor to tune ink consumption)
  return totalLength / 10;
}