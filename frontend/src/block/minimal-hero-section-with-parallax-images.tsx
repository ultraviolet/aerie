"use client";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export const LandingImages = () => {
  return (
    <div className="relative h-full w-full perspective-distant">
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute inset-0 perspective-[4000px]"
      >
        <img
          src="/i1.png"
          alt="aerie screenshot"
          className={cn(
            "w-[220%] rounded-lg border border-neutral-200 mask-r-from-30% mask-b-from-30% shadow-xl dark:border-neutral-800",
          )}
          style={{
            transform: "rotateY(20deg) rotateX(40deg) rotateZ(-20deg)",
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="relative translate-x-20 perspective-[4000px]"
      >
        <img
          src="/i3.png"
          alt="aerie screenshot"
          className={cn(
            "w-[220%] rounded-lg border border-neutral-200 mask-r-from-90% mask-b-from-90% shadow-2xl dark:border-neutral-800",
          )}
          style={{
            transform: "rotateY(20deg) rotateX(40deg) rotateZ(-20deg)",
          }}
        />
      </motion.div>
    </div>
  );
};

export default LandingImages;
