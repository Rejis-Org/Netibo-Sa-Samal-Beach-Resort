"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";

const MotionLink = motion.create(Link);

type Props = { href: string; className?: string; children: ReactNode };

/** A link card that lifts on hover and presses in on tap. Respects reduced motion via MotionProvider. */
export function MotionCardLink({ href, className, children }: Props) {
  return (
    <MotionLink
      href={href}
      className={className}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      {children}
    </MotionLink>
  );
}
