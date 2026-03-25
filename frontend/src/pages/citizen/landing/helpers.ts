import type { Variants } from "framer-motion";

export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

export const stagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function formatCompact(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

export function toBarHeightClass(value: number, maxValue: number) {
  const safeMax = Math.max(maxValue, 1);
  const ratio = Math.max(0.1, Math.min(1, value / safeMax));
  const level = Math.max(1, Math.min(10, Math.round(ratio * 10)));
  return `us-bar-h-${level}`;
}
