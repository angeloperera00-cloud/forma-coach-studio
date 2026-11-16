"use client";

import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/overlays";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
      <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
    </MotionConfig>
  );
}
