"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Removed all scale and translate transforms
  "relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none shrink-0 transition-all duration-300 ease-in-out cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(0,0,0,0.15)] active:brightness-75",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 hover:shadow-destructive/20 active:brightness-75",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_15px_rgba(0,0,0,0.05)] active:brightness-90",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:brightness-90",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:brightness-90",
        link: "text-primary underline-offset-4 hover:underline active:opacity-70",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  children,
  onMouseMove,
  ...props
}: ButtonProps) {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    onMouseMove?.(e);
  };

  const Comp = asChild && !isLoading ? Slot : "button";

  return (
    <Comp
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative",
        isLoading && "cursor-wait",
        buttonVariants({ variant, size, className }),
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Spotlight Effect: Now the primary hover feedback along with the shadow */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(150px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.15), transparent 80%)`,
        }}
      />

      <span className="relative z-10 flex items-center gap-2">
        {isLoading && <Loader2 className="animate-spin" />}
        {children}
      </span>
    </Comp>
  );
}

export { Button, buttonVariants };
