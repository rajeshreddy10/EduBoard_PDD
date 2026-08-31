"use client";

import React, { useEffect, useRef, useState } from "react";
import { socketService } from "@/lib/socket";
import { MousePointer2, Pencil, Eraser } from "lucide-react";

type Tool = "pen" | "eraser" | "pointer";
type GestureType = "pinch" | "five" | "hover" | "none";

interface GestureData {
  x: number;
  y: number;
  gesture: GestureType;
}

export function GestureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [gestureData, setGestureData] = useState<GestureData>({ x: 0, y: 0, gesture: "hover" });
  const toolRef = useRef(tool);
  
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const isDrawingRef = useRef(false);
  const isErasingRef = useRef(false);

  useEffect(() => {
    socketService.connect();

    const handleGesture = (data: GestureData) => {
      setGestureData(data);

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      const currentTool = toolRef.current;

      // Pinch or Five fingers → perform tool action
      if (data.gesture === "pinch" || data.gesture === "five") {
        const isActive = data.gesture === "pinch"
          ? !isDrawingRef.current && !isErasingRef.current
            ? true
            : isDrawingRef.current || isErasingRef.current
          : true;

        if (currentTool === "pen") {
          if (!isDrawingRef.current) {
            isDrawingRef.current = true;
            isErasingRef.current = false;
            ctx.beginPath();
            ctx.moveTo(data.x, data.y);
          } else {
            ctx.lineTo(data.x, data.y);
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
          }
        } else if (currentTool === "eraser") {
          if (!isErasingRef.current) {
            isErasingRef.current = true;
            isDrawingRef.current = false;
            ctx.beginPath();
            ctx.moveTo(data.x, data.y);
          } else {
            ctx.lineTo(data.x, data.y);
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineWidth = 40;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
          }
        } else {
          if (isDrawingRef.current || isErasingRef.current) {
            isDrawingRef.current = false;
            isErasingRef.current = false;
            ctx.closePath();
            ctx.globalCompositeOperation = "source-over";
          }
        }
      } else {
        if (isDrawingRef.current || isErasingRef.current) {
          isDrawingRef.current = false;
          isErasingRef.current = false;
          ctx.closePath();
          ctx.globalCompositeOperation = "source-over";
        }
      }
    };

    const unsubscribe = socketService.onGesture(handleGesture);

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, []);

  const cursorLabel = (() => {
    if (gestureData.gesture === "none") return "pointer";
    return tool;
  })();

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <div
        className="absolute pointer-events-none z-50 transition-all duration-75"
        style={{
          left: `${gestureData.x}px`,
          top: `${gestureData.y}px`,
          // Adjust transform so the icon tip exactly overlaps the coordinate
          transform: cursorLabel === "pen" ? "translate(-15%, -85%)" :
                     cursorLabel === "pointer" ? "translate(-20%, -20%)" :
                     "translate(-50%, -50%)"
        }}
      >
        <div className="relative">
          {cursorLabel === "pen" && (
            <Pencil className="text-blue-400 drop-shadow-md w-6 h-6 animate-pulse" />
          )}
          {cursorLabel === "eraser" && (
            <Eraser className="text-red-400 drop-shadow-md w-8 h-8" />
          )}
          {cursorLabel === "pointer" && (
            <MousePointer2 className="text-white drop-shadow-md w-6 h-6" />
          )}
          {cursorLabel === "pen" && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
            </span>
          )}
          {cursorLabel === "eraser" && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50" />
            </span>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-none"
        width={1920}
        height={1080}
      />

      {/* Floating Toolbar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 glass-panel p-2 flex flex-col space-y-4 rounded-2xl z-40">
        <button
          onClick={() => setTool("pen")}
          className={`p-3 rounded-xl shadow-lg transition-all ${tool === "pen" ? "bg-blue-600 text-white shadow-blue-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`p-3 rounded-xl transition-all ${tool === "eraser" ? "bg-red-600 text-white shadow-red-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
        >
          <Eraser className="w-5 h-5" />
        </button>
        <button
          onClick={() => setTool("pointer")}
          className={`p-3 rounded-xl transition-all ${tool === "pointer" ? "bg-slate-600 text-white shadow-slate-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
        >
          <MousePointer2 className="w-5 h-5" />
        </button>
      </div>

      {/* Current Mode Indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-4 py-2 rounded-full z-40 flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${tool === "pen" ? "bg-blue-500 animate-pulse" : tool === "eraser" ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
        <span className="text-sm font-medium text-white capitalize">{tool} Mode</span>
      </div>
    </div>
  );
}
