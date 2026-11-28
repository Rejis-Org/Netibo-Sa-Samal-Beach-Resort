"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";

const MotionLink = motion.create(Link);

type Props = {
  href: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
};

/** A small pill button link with a gentle hover grow and tap press. Respects reduced motion via MotionProvider. */
export function MotionPillLink({ href, className, disabled = false, children }: Props) {
  return (
    <MotionLink
      href={href}
      className={className}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      {children}
    </MotionLink>
  );
}
