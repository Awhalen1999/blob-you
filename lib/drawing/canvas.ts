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
  ctx.clearRect(0, 0, width, height);
}