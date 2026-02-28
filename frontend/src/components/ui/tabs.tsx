"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        // Added 'isolate': This creates a new stacking context so
        // absolute elements don't bleed out or cause "ghost" flashes
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col isolate",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "rounded-lg p-[3px] group-data-[orientation=horizontal]/tabs:h-9 data-[variant=line]:rounded-none group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  onMouseMove,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    onMouseMove?.(e);
  };

  return (
    <TabsPrimitive.Trigger
      ref={triggerRef}
      onMouseMove={handleMouseMove}
      data-slot="tabs-trigger"
      className={cn(
        "relative overflow-hidden cursor-grab active:cursor-grabbing",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-input/30",
        "hover:scale-[1.01] active:scale-95 active:shadow-sm transition-all duration-200",
        "group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        className,
      )}
      {...props}
    >
      {/* Spotlight Effect - only shows on hover */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover/tabs-trigger:opacity-100"
        style={{
          background: `radial-gradient(100px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.1), transparent 80%)`,
        }}
      />

      <span className="relative z-10">{props.children}</span>

      {/* Line Variant Indicator */}
      <div className="absolute bg-foreground opacity-0 transition-all duration-300 group-data-[variant=line]/tabs-list:group-data-[state=active]/tabs-trigger:opacity-100 group-data-[orientation=horizontal]/tabs:inset-x-0 group-data-[orientation=horizontal]/tabs:bottom-[-2px] group-data-[orientation=horizontal]/tabs:h-0.5 group-data-[orientation=vertical]/tabs:inset-y-0 group-data-[orientation=vertical]/tabs:-right-1 group-data-[orientation=vertical]/tabs:w-0.5" />
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "relative flex-1 outline-none",
        // Pure Fade Logic:
        // 1. duration-500: A longer duration makes the fade feel "expensive"
        // 2. ease-in-out: Creates a smooth start and end to the transition
        "data-[state=active]:animate-in",
        "data-[state=active]:fade-in-0",
        "data-[state=active]:duration-500",
        "data-[state=active]:ease-in-out",
        // Immediate removal of old content to prevent any layout overlap
        "data-[state=inactive]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
