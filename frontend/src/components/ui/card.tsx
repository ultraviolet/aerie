"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  // We check for a "cursor-pointer" in the className to see if we should apply interaction
  const isInteractive = className?.includes("cursor-pointer");

  return (
    <div
      data-slot="card"
      className={cn(
        // Base Layout (Non-Interactive)
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/40 py-6 isolate relative overflow-hidden",
        "shadow-[0_0_10px_rgba(0,0,0,0.05)] dark:shadow-[0_0_10px_rgba(0,0,0,0.2)]",

        // Interactive Variant: Only active if cursor-pointer is passed
        isInteractive && [
          "transition-all duration-400 ease-in-out opacity-95",
          "hover:opacity-100 hover:bg-accent/50 hover:shadow-[0_0_10px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_0_10px_rgba(0,0,0,0.6)]",
          "active:brightness-80 active:scale-[0.998] active:shadow-[0_0_10px_rgba(0,0,0,0.35)] dark:active:shadow-[0_0_10px_rgba(0,0,0,0.8)]",
        ],
        className,
      )}
      {...props}
    >
      {/* Interaction Overlay: Only visible if interactive */}
      {isInteractive && (
        <div className="pointer-events-none absolute inset-0 z-0 bg-black/0 transition-colors duration-400 ease-in-out hover:bg-black/10 active:bg-black/30 dark:active:bg-white/15" />
      )}

      <div className="relative z-10 flex flex-col gap-6">{props.children}</div>
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end relative z-20",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
