"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  const isInteractive = className?.includes("cursor-pointer");

  return (
    <div
      data-slot="card"
      className={cn(
        // Base Layout
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/40 py-6 relative overflow-hidden transition-all duration-300",

        // The Grounded 10px Shadow
        "shadow-[0_0_10px_rgba(0,0,0,0.05)] dark:shadow-[0_0_10px_rgba(0,0,0,0.2)]",

        // Interaction Logic: High-Contrast Accent Glow
        isInteractive && [
          "opacity-95 hover:opacity-100",
          "hover:bg-accent/90 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_10px_rgba(0,0,0,0.4)]",
          "active:scale-[0.998] active:brightness-90 active:duration-500",
        ],

        className,
      )}
      {...props}
    >
      {/* Content wrapper ensures children are flex-spaced correctly */}
      <div className="flex flex-col gap-6">{props.children}</div>
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 px-6", className)}
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
      className={cn("flex items-center px-6 pt-0", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
