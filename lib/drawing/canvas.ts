import type { Point } from '@/types/game';

export function getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

export function getTouchPos(canvas: HTMLCanvasElement, evt: TouchEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.touches[0].clientX - rect.left,
    y: evt.touches[0].clientY - rect.top,
  };
}

export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw subtle loose leaf paper background
  // Off-white paper color
  ctx.fillStyle = '#faf9f6';
  ctx.fillRect(0, 0, width, height);
  
  // Very subtle horizontal lines (like loose leaf paper)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  const lineSpacing = 24; // Spacing between lines
  
  for (let y = lineSpacing; y < height; y += lineSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Very subtle left margin line (optional, like notebook margin)
  ctx.strokeStyle = 'rgba(200, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.lineTo(32, height);
  ctx.stroke();
}