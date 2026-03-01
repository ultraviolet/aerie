"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export default function Hero() {
  return (
    <div className="w-full pt-10 md:pt-20 lg:pt-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h1 className="text-center text-2xl font-bold tracking-tight md:text-left md:text-4xl lg:text-6xl">
          Agents that do the work <br /> Approvals that keep you safe.
        </h1>

        <h2 className="font-inter max-w-xl py-8 text-center text-base text-neutral-500 md:text-left md:text-lg dark:text-neutral-400">
          Deploy AI agents that plan, act through your tools, and report
          outcomes—without changing how your teams work.
        </h2>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <button className="rounded-sm bg-black px-4 py-2 text-white shadow-2xl dark:bg-white dark:text-black">
            Start your free trial
          </button>
          <button className="rounded-sm bg-transparent px-4 py-2 text-black dark:text-white">
            <a href="#">View role based demos</a>
          </button>
        </div>
        <LandingImages />
      </div>
    </div>
  );
}

export const LandingImages = () => {
  return (
    <div className="relative mt-16 w-full perspective-distant">
      <motion.div
        initial={{
          opacity: 0,
          y: -100,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
        }}
        viewport={{
          once: true,
        }}
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
        initial={{
          opacity: 0,
          y: -100,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
        }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
          delay: 0.1,
        }}
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
