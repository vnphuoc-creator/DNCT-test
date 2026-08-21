"use client";
import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
}

export const Reveal = ({ children }: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
};