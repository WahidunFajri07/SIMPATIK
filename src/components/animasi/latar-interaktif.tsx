"use client";
import { useEffect, useRef } from "react";
export function LatarInteraktif() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cursor = { x: -999, y: -999 };
    let w = 0,
      h = 0;
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (let x = 18; x < w; x += 32)
        for (let y = 18; y < h; y += 32) {
          const d = Math.hypot(x - cursor.x, y - cursor.y),
            strength = Math.max(0, 1 - d / 180);
          ctx.beginPath();
          ctx.arc(
            x + strength * (x - cursor.x) * 0.1,
            y + strength * (y - cursor.y) * 0.1,
            1 + strength,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = `rgba(18,115,109,${0.12 + strength * 0.24})`;
          ctx.fill();
        }
    }
    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      const d = Math.min(devicePixelRatio, 2);
      canvas.width = w * d;
      canvas.height = h * d;
      ctx!.setTransform(d, 0, 0, d, 0, 0);
      draw();
    }
    function move(e: MouseEvent) {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      draw();
    }
    resize();
    window.addEventListener("resize", resize);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", move);
    };
  }, []);
  return <canvas className="background-canvas" ref={ref} aria-hidden="true" />;
}
