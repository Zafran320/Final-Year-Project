import React, { useEffect, useRef, useState } from "react";

const COLS = 12;
const ROWS = 6;
const FRAMES = 72;
const DEG_PER_FRAME = 360 / FRAMES;

// Crop fractions from motion analysis: x 463..1352 of 1920
const STRIP_X = 463 / 1920;
const STRIP_W = 889 / 1920;
const ROOM_ASPECT = 16 / 9;

// Eye tracking focal point within the frame
const EYE_X = 0.485;
const EYE_Y = 0.330;

// Physics constants
const STIFFNESS = 700;
const DAMPING = 53;
const IDLE_EASE = 4.5;
const PARALLAX = 16;

function shortestAngle(target: number, current: number) {
  let diff = (target - current) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

export interface MouseTrackingHeroCanvasProps {
  reducedMotion?: boolean;
  className?: string;
}

export function MouseTrackingHeroCanvas({ reducedMotion = false, className = "" }: MouseTrackingHeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let destroyed = false;
    let roomImg: HTMLImageElement | null = null;
    let sheetImg: HTMLImageElement | null = null;
    let idleImg: HTMLImageElement | null = null;
    let cellW = 0;
    let cellH = 0;
    let loadedTier: "mobile" | "desktop" | null = null;

    let viewW = 0;
    let viewH = 0;
    let fitX = 0;
    let fitY = 0;
    let fitW = 0;
    let fitH = 0;

    let angle = 0;
    let angleVel = 0;
    let targetAngle = 0;
    let idleMix = 1;
    let pointerActive = false;
    let targetOffX = 0;
    let targetOffY = 0;
    let offX = 0;
    let offY = 0;

    let glowTX = 0;
    let glowTY = 0;
    let glowX = 0;
    let glowY = 0;
    let drift = 0;

    let dirty = true;
    let animFrameId: number | null = null;
    let lastTs: number | null = null;

    const touchOnly = window.matchMedia("(hover: none)").matches;

    function useMobile() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      return window.innerWidth * dpr <= 1200;
    }

    function loadImage(src: string, cb: (img: HTMLImageElement | null) => void) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (!destroyed) cb(img);
      };
      img.onerror = () => {
        if (!destroyed) cb(null);
      };
      img.src = src;
    }

    function handleLoaded() {
      if (destroyed) return;
      setIsLoaded(true);
      dirty = true;
    }

    // Load static background room
    loadImage("/assets/room.jpg", (img) => {
      roomImg = img;
      handleLoaded();
    });

    function loadTier() {
      const tier = useMobile() ? "mobile" : "desktop";
      if (tier === loadedTier) return;
      loadedTier = tier;

      loadImage(`/assets/char-${tier}.jpg`, (img) => {
        if (!img || destroyed) return;
        sheetImg = img;
        cellW = img.naturalWidth / COLS;
        cellH = img.naturalHeight / ROWS;
        handleLoaded();
      });

      loadImage(`/assets/char-${tier}-idle.jpg`, (img) => {
        if (!img || destroyed) return;
        idleImg = img;
        handleLoaded();
      });
    }

    loadTier();

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewW = window.innerWidth;
      viewH = window.innerHeight;

      canvas.width = Math.max(1, Math.round(viewW * dpr));
      canvas.height = Math.max(1, Math.round(viewH * dpr));
      canvas.style.width = `${viewW}px`;
      canvas.style.height = `${viewH}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (viewW / viewH > ROOM_ASPECT) {
        fitW = viewW;
        fitH = viewW / ROOM_ASPECT;
      } else {
        fitH = viewH;
        fitW = viewH * ROOM_ASPECT;
      }
      fitX = (viewW - fitW) / 2;
      fitY = (viewH - fitH) / 2;

      dirty = true;
    }

    resize();

    function onPointerMove(cx: number, cy: number) {
      const eyeX = fitX + offX + EYE_X * fitW;
      const eyeY = fitY + offY + EYE_Y * fitH;

      const dx = cx - eyeX;
      const dy = cy - eyeY;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = right, +y = down
        targetAngle = ((deg - 90) + 360) % 360; // clockwise from down
      }

      pointerActive = true;

      const nx = Math.max(-1, Math.min(1, dx / (viewW / 2 || 1)));
      const ny = Math.max(-1, Math.min(1, dy / (viewH / 2 || 1)));
      targetOffX = -nx * PARALLAX;
      targetOffY = -ny * PARALLAX * 0.6;

      glowTX = cx;
      glowTY = cy;
      if (glowRef.current) glowRef.current.classList.add("is-visible");
      dirty = true;
    }

    function onPointerLeave() {
      pointerActive = false;
      targetOffX = 0;
      targetOffY = 0;
      if (glowRef.current) glowRef.current.classList.remove("is-visible");
      dirty = true;
    }

    const handleMouseMove = (e: MouseEvent) => {
      onPointerMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", onPointerLeave, { passive: true });
    window.addEventListener("touchcancel", onPointerLeave, { passive: true });
    document.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      resize();
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(loadTier, 300);
    };
    window.addEventListener("resize", handleResize);

    function drawCell(index: number, alpha: number, sx: number, sy: number, sw: number, sh: number) {
      if (!sheetImg || !ctx || alpha <= 0.002) return;
      const i = ((index % FRAMES) + FRAMES) % FRAMES;
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        sheetImg,
        (i % COLS) * cellW,
        Math.floor(i / COLS) * cellH,
        cellW,
        cellH,
        sx,
        sy,
        sw,
        sh
      );
    }

    function render() {
      if (!ctx) return;
      const ox = fitX + offX;
      const oy = fitY + offY;

      // Static room background
      ctx.globalAlpha = 1;
      if (roomImg) {
        ctx.drawImage(roomImg, ox, oy, fitW, fitH);
      } else {
        ctx.fillStyle = "#0B0B0E";
        ctx.fillRect(0, 0, viewW, viewH);
      }

      // Animated character strip
      const sx = ox + STRIP_X * fitW;
      const sw = STRIP_W * fitW;

      if (!reducedMotion && idleMix < 0.998) {
        const pos = angle / DEG_PER_FRAME;
        const a = Math.floor(pos);
        const blend = pos - a;
        const trackAlpha = 1 - idleMix;

        drawCell(a, trackAlpha, sx, oy, sw, fitH);
        if (blend > 0.002) {
          drawCell(a + 1, trackAlpha * blend, sx, oy, sw, fitH);
        }
      }

      if (idleImg && (reducedMotion || idleMix > 0.002)) {
        ctx.globalAlpha = reducedMotion ? 1 : idleMix;
        ctx.drawImage(idleImg, sx, oy, sw, fitH);
      }

      ctx.globalAlpha = 1;
    }

    function tick(ts: number) {
      if (destroyed) return;
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      if (touchOnly && !pointerActive && !reducedMotion) {
        drift += dt * 12;
        targetAngle = drift % 360;
        pointerActive = true;
        dirty = true;
      }

      const prevAngle = angle;
      const prevMix = idleMix;

      if (!reducedMotion) {
        const diff = shortestAngle(targetAngle, angle);
        angleVel += (diff * STIFFNESS - angleVel * DAMPING) * dt;
        angle = (angle + angleVel * dt) % 360;
        if (angle < 0) angle += 360;

        idleMix += ((pointerActive ? 0 : 1) - idleMix) * Math.min(1, IDLE_EASE * dt);

        offX += (targetOffX - offX) * 0.09;
        offY += (targetOffY - offY) * 0.09;

        if (Math.abs(angle - prevAngle) > 0.01 || Math.abs(idleMix - prevMix) > 0.001) {
          dirty = true;
        }
      }

      if (dirty) {
        render();
        dirty = false;
      }

      if (glowRef.current && !reducedMotion) {
        glowX += (glowTX - glowX) * 0.18;
        glowY += (glowTY - glowY) * 0.18;
        glowRef.current.style.transform = `translate3d(${glowX.toFixed(1)}px, ${glowY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }

      animFrameId = requestAnimationFrame(tick);
    }

    animFrameId = requestAnimationFrame(tick);

    return () => {
      destroyed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", onPointerLeave);
      window.removeEventListener("touchcancel", onPointerLeave);
      document.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, [reducedMotion]);

  return (
    <>
      <div
        className={`ct-hero-bg ${isLoaded ? "is-loaded" : ""} ${className}`}
        id="bg"
        aria-hidden="true"
      >
        <canvas className="ct-hero-bg__canvas" ref={canvasRef} id="bgCanvas" />
        <div className="ct-hero-bg__scrim" />
      </div>
      <div className="ct-pointer-glow" ref={glowRef} id="glow" aria-hidden="true" />
    </>
  );
}
