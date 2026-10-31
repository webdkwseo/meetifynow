"use client";

import { motion } from "framer-motion";
import { CSSProperties } from "react";

/**
 * Background of the active option in a segmented control. Rendering it only in
 * the active item with a shared `layoutId` makes it glide between options.
 * The item needs `relative isolate`.
 */
export default function SlidingPill({
  layoutId,
  className = "bg-white shadow-sm rounded-xl",
  style,
}: {
  layoutId: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.span
      layoutId={layoutId}
      aria-hidden
      className={`absolute inset-0 -z-10 ${className}`}
      style={style}
      transition={{ type: "spring", stiffness: 500, damping: 38 }}
    />
  );
}
