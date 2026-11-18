import { useEffect, useRef } from "react";

/**
 * Sharp, unblurred scenic backdrop (trees, lake, clouds) with subtle ambient motion
 * and an interactive light dark-overlay that responds to pointer and scroll movement.
 */
export function LivingBackdrop({
  variant = "hero",
}: {
  variant?: "hero" | "band";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    let targetX = 50;
    let targetY = 45;
    let curX = 50;
    let curY = 45;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      targetY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    };

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, -rect.top / Math.max(window.innerHeight, 1)));
      el.style.setProperty("--parallax-y", `${(progress * 18).toFixed(2)}px`);
    };

    const tick = () => {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      el.style.setProperty("--mx", `${curX.toFixed(2)}%`);
      el.style.setProperty("--my", `${curY.toFixed(2)}%`);
      el.style.setProperty("--pan-x", `${((curX - 50) * -0.18).toFixed(2)}px`);
      el.style.setProperty("--pan-y", `${((curY - 50) * -0.12).toFixed(2)}px`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(container.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(container.clientHeight * 0.42 * dpr));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    observer.observe(container);

    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    const render = (now: number) => {
      if (visible) {
        const t = (now - start) * 0.001;
        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const lines = 22;
        for (let i = 0; i < lines; i++) {
          const depth = i / lines;
          const y = height * (0.1 + depth * 0.85);
          const waveOffset = Math.sin(t * 0.85 + i * 1.1) * (18 + depth * 24);
          const xCenter = width * ((0.18 + ((i * 0.37) % 0.72))) + waveOffset;
          const rippleWidth = width * (0.09 + depth * 0.14);
          const alpha = (0.035 + Math.sin(t * 1.3 + i) * 0.02) * (0.45 + depth * 0.55);

          const grad = ctx.createLinearGradient(xCenter - rippleWidth, y, xCenter + rippleWidth, y);
          grad.addColorStop(0, "rgba(255, 255, 255, 0)");
          grad.addColorStop(0.5, `rgba(218, 245, 236, ${alpha.toFixed(3)})`);
          grad.addColorStop(1, "rgba(255, 255, 255, 0)");

          ctx.fillStyle = grad;
          ctx.fillRect(xCenter - rippleWidth, y, rippleWidth * 2, 1.5 + depth * 1.5);
        }
      }
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={
        {
          "--mx": "50%",
          "--my": "45%",
          "--pan-x": "0px",
          "--pan-y": "0px",
          "--parallax-y": "0px",
        } as React.CSSProperties
      }
    >
      <img
        src="/images/forest-river-bg.jpg"
        alt=""
        className="h-full w-full object-cover object-center will-change-transform"
        style={{
          transform:
            "translate3d(var(--pan-x), calc(var(--pan-y) + var(--parallax-y)), 0) scale(1.06)",
          transition: "transform 120ms ease-out",
        }}
      />

      <div className="animate-cloud-drift absolute inset-x-[-20%] top-0 h-[44%] opacity-45 mix-blend-screen">
        <div
          className="h-full w-full"
          style={{
            background:
              "radial-gradient(ellipse 35% 45% at 22% 35%, rgba(255,255,255,0.28), transparent 70%), radial-gradient(ellipse 40% 50% at 68% 28%, rgba(234,248,241,0.22), transparent 72%)",
          }}
        />
      </div>

      <div
        className="animate-wind-sway absolute inset-x-[-8%] top-[24%] h-[42%] opacity-35 mix-blend-soft-light"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 35% 50%, rgba(139,219,184,0.35), transparent 70%), radial-gradient(ellipse 45% 55% at 75% 45%, rgba(255,255,255,0.22), transparent 70%)",
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-x-0 bottom-0 h-[42%] w-full opacity-90"
      />

      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background:
            variant === "hero"
              ? `radial-gradient(circle 520px at var(--mx) var(--my), rgba(11, 32, 55, 0.24), rgba(11, 32, 55, 0.56) 70%), linear-gradient(180deg, rgba(11, 32, 55, 0.42) 0%, rgba(11, 32, 55, 0.28) 45%, rgba(11, 32, 55, 0.62) 100%)`
              : `radial-gradient(circle 480px at var(--mx) var(--my), rgba(11, 32, 55, 0.34), rgba(11, 32, 55, 0.66) 72%)`,
        }}
      />

      {variant === "hero" && (
        <div
          className="absolute inset-x-0 bottom-0 h-20"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(239, 230, 212, 0.35) 100%)",
          }}
        />
      )}
    </div>
  );
}
