"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AdminPageTransitionProps {
  children: ReactNode;
  className?: string;
}

export default function AdminPageTransition({
  children,
  className = "",
}: AdminPageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
