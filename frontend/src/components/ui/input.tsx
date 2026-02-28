"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <div className="group relative w-full">
      {/* Softened Halo */}
      <div className="absolute -inset-px rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 blur-sm transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-30" />

      <input
        type={type}
        data-slot="input"
        className={cn(
          "relative h-10 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm transition-all duration-200",
          "bg-background dark:bg-input/10",
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary/20 md:text-sm",
          "hover:border-primary/30",
          "focus:border-primary/60 focus:ring-[2px] focus:ring-primary/10 focus:outline-none",
          "focus:-translate-y-[0.5px]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/10",
          className,
        )}
        {...props} // <-- Fixed: Added the curly braces back!
      />
    </div>
  );
}

export { Input };
