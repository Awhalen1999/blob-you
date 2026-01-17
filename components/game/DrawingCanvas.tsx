'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getMousePos, getTouchPos, clearCanvas } from '@/lib/drawing/canvas';
import type { Point, Stroke } from '@/types/game';
import Button from '@/components/ui/Button';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 450;

export default function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [liveInk, setLiveInk] = useState(100);

  const {
    myStrokes,
    addMyStroke,
    inkRemaining,
    decreaseInk,
    drawingTimeLeft,
    setDrawingTimeLeft,
    gameMode,
    reset,
    setPhase,
  } = useGameStore();

  // Sync liveInk with store when not drawing
  useEffect(() => {
    if (!isDrawing) {
      requestAnimationFrame(() => {
        setLiveInk(inkRemaining);
      });
    }
  }, [inkRemaining, isDrawing]);

  // Calculate ink used for current stroke in real-time
  const calculateLiveInk = useCallback((points: Point[]) => {
    if (points.length < 2) return 0;
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    return totalLength / 10;
  }, []);

  // Draw all strokes to canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of myStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    if (currentStroke.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }
  }, [myStrokes, currentStroke]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Timer countdown
  useEffect(() => {
    if (drawingTimeLeft <= 0 || isReady) return;

    const interval = setInterval(() => {
      setDrawingTimeLeft(drawingTimeLeft - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [drawingTimeLeft, setDrawingTimeLeft, isReady]);

  // Auto-ready when timer hits 0
  useEffect(() => {
    if (drawingTimeLeft === 0 && !isReady && gameMode === 'npc') {
      requestAnimationFrame(() => {
        setIsReady(true);
        setPhase('fighting');
      });
    }
  }, [drawingTimeLeft, isReady, gameMode, setPhase]);

  // Start drawing
  const startDrawing = (point: Point) => {
    if (liveInk <= 0 || isReady) return;
    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  // Continue drawing with live ink update
  const continueDrawing = (point: Point) => {
    if (!isDrawing || isReady) return;

    const newStroke = [...currentStroke, point];
    const inkUsed = calculateLiveInk(newStroke);
    const newInk = Math.max(0, inkRemaining - inkUsed);

    if (newInk <= 0) {
      // Out of ink - end stroke
      endDrawing();
      return;
    }

    setCurrentStroke(newStroke);
    setLiveInk(newInk);
  };

  // End drawing
  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStroke.length >= 2) {
      const stroke: Stroke = {
        points: currentStroke,
        timestamp: Date.now(),
      };
      const inkUsed = calculateLiveInk(currentStroke);
      decreaseInk(inkUsed);
      addMyStroke(stroke);
    }

    setCurrentStroke([]);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getMousePos(canvas, e.nativeEvent);
    startDrawing(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getMousePos(canvas, e.nativeEvent);
    continueDrawing(pos);
  };

  const handleMouseUp = () => endDrawing();

  // Touch events
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getTouchPos(canvas, e.nativeEvent);
    startDrawing(pos);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getTouchPos(canvas, e.nativeEvent);
    continueDrawing(pos);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    endDrawing();
  };

  // Ready button
  const handleReady = () => {
    if (isReady) return;
    setIsReady(true);

    if (gameMode === 'npc') {
      setPhase('fighting');
    }
  };

  // Back button - exit battle/drawing session
  const handleBack = () => {
    console.log('battle ended');
    reset();
  };

  // Status flags
  const timerLow = drawingTimeLeft <= 10;
  const timerCritical = drawingTimeLeft <= 5;
  const inkLow = liveInk <= 30;
  const inkCritical = liveInk <= 15;

  return (
    <div className="relative w-full h-full min-h-screen">
      {/* Back button - top left */}
      <Button
        onClick={handleBack}
        variant="secondary"
        size="md"
        icon={<ArrowLeft className="w-4 h-4" />}
        className="absolute top-4 left-4 z-10"
      >
        Back
      </Button>

      <div className="flex flex-col items-center justify-center gap-md h-full">
        {/* Timer - Nintendo style */}
      <div
        className={`
          px-4 py-2 rounded-md border-2 font-bold text-2xl font-mono
          transition-all duration-200
          ${timerCritical
            ? 'bg-red-500/90 border-red-300 text-white animate-pulse'
            : timerLow
              ? 'bg-orange-500/80 border-orange-300 text-white animate-[shake_0.5s_ease-in-out_infinite]'
              : 'bg-black/50 border-white/30 text-white'
          }
        `}
      >
        {drawingTimeLeft}
      </div>

      {/* Main drawing area */}
      <div className="flex gap-md items-stretch">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`
            bg-white rounded-md border-4 cursor-crosshair touch-none
            ${isReady ? 'opacity-70 pointer-events-none' : ''}
            ${inkCritical ? 'border-red-400' : inkLow ? 'border-orange-400' : 'border-white/40'}
          `}
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        />

        {/* Ink meter - Gamified vertical bar */}
        <div className="flex flex-col items-center gap-sm">
          <span className="text-xs font-bold text-white/70">INK</span>
          <div
            className={`
              w-8 flex-1 bg-black/60 border-4 rounded-md relative overflow-hidden
              transition-all duration-200
              ${inkCritical
                ? 'border-red-400 animate-[shake_0.3s_ease-in-out_infinite]'
                : inkLow
                  ? 'border-orange-400 animate-[shake_0.5s_ease-in-out_infinite]'
                  : 'border-white/40'
              }
            `}
          >
            {/* Ink fill */}
            <div
              className={`
                absolute bottom-0 left-0 right-0 transition-all duration-75
                ${inkCritical
                  ? 'bg-red-400'
                  : inkLow
                    ? 'bg-orange-400'
                    : 'bg-green-500'
                }
              `}
              style={{ height: `${liveInk}%` }}
            />
            {/* Meter lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-full h-px bg-purple-900/30" />
              ))}
            </div>
          </div>
          <span className="text-xs font-bold text-white/70">{Math.round(liveInk)}%</span>
        </div>
      </div>

      {/* Ready button */}
      <Button
        onClick={handleReady}
        disabled={isReady}
        variant={isReady ? 'success' : 'primary'}
        size="lg"
        icon={isReady ? <Check className="w-5 h-5" /> : undefined}
      >
        {isReady ? 'Ready!' : 'Ready'}
      </Button>
      </div>
    </div>
  );
}
