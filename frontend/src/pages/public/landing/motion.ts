import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useReducedMotion, type Variants } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay } }),
};

export function useSmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -88 }, lerp: 0.11 });
    return () => lenis.destroy();
  }, [reduce]);
}
