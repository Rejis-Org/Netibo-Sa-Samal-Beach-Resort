"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

/** A stat card that lifts slightly on hover, matching the overview cards. Respects reduced motion via MotionProvider. */
export function MotionCard({ children }: { children: ReactNode }) {
  return (
    <motion.article
      className="admin-stat-card"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      {children}
    </motion.article>
  );
}
