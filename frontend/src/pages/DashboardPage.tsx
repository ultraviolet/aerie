"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  BrainCircuit,
  History,
  Sparkles,
  ArrowRight,
  MessageSquare,
  GraduationCap,
  Flame,
  Info,
  BookOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { api } from "@/api";
import type { Course } from "@/types";

const RECENT_TOPICS = [
  { topic: "NFA Sim", score: 88, warning: false },
  { topic: "Fooling Sets", score: 42, warning: true },
  { topic: "Pumping Lemma", score: 71, warning: false },
  { topic: "CFG Grammars", score: 92, warning: false },
  { topic: "Regex Parser", score: 31, warning: true },
  { topic: "DFA Minimization", score: 65, warning: false },
];

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const masteryContainerRef = useRef<HTMLDivElement>(null);
  const [masteryLimit, setMasteryLimit] = useState(4);

  useEffect(() => {
    api.listCourses().then(setCourses).catch(console.error);
  }, []);

  useEffect(() => {
    if (!masteryContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const containerHeight = entries[0].contentRect.height;
      // Reverting to your exact logic: (height + gap) / (itemHeight + gap)
      const fit = Math.floor((containerHeight + 12) / (68 + 12));
      setMasteryLimit(fit > 0 ? fit : 0);
    });
    observer.observe(masteryContainerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    // mt-0 removes top margin. pb-10 adds bottom breathing room.
    <div
      className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-0 pb-10 animate-in fade-in duration-700"
      style={{ overflow: "hidden" }}
    >
      {/* LEFT & CENTER STACK */}
      <div
        className="lg:col-span-3 flex flex-col gap-6 h-full min-h-0"
        style={{ height: "100%", overflow: "hidden" }}
      >
        {/* 1. STREAK GRID */}
        <Card className="bg-slate-800 border-slate-700 shadow-xl shrink-0">
          <CardContent className="py-4 flex flex-col md:flex-row items-center gap-8">
            <div className="flex items-center gap-3 shrink-0 border-r border-slate-600 pr-6">
              <div className="p-2 rounded-full bg-orange-500/20">
                <Flame className="size-6 text-orange-500" />
              </div>
              <div>
                <p className="text-xl font-black text-white leading-none">12</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                  Streak
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex flex-wrap gap-1.5">
                {[...Array(28)].map((_, i) => {
                  const intensity = [0.2, 0.5, 0.8, 1.0][
                    Math.floor(Math.random() * 4)
                  ];
                  const isActive = Math.random() > 0.3;
                  return (
                    <div
                      key={i}
                      className="size-3.5 rounded-[2px] border"
                      style={{
                        backgroundColor: isActive
                          ? `rgba(249, 115, 22, ${intensity})`
                          : "rgba(51, 65, 85, 1)",
                        borderColor: isActive
                          ? "rgba(249, 115, 22, 0.4)"
                          : "rgba(71, 85, 105, 1)",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. MAIN INTERACTIVE AREA */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          <Card className="bg-white border-slate-200 flex flex-col h-full shadow-lg min-h-0">
            <CardHeader className="shrink-0 pb-4">
              <CardTitle className="text-3xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="size-8 text-primary" /> Start
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 flex-1 justify-end p-6 pt-0">
              <Button
                variant="outline"
                className="w-full bg-white border-slate-300 text-slate-900 font-bold h-14 shrink-0"
              >
                <MessageSquare className="mr-2 size-5" /> AI Chat
              </Button>
              <Button className="w-full bg-primary text-primary-foreground font-black text-xl shadow-xl flex-1 min-h-[4rem]">
                <BrainCircuit className="mr-2 size-6" /> Practice Quiz
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-100 border-slate-200 flex flex-col h-full shadow-inner min-h-0">
            <CardHeader className="shrink-0 border-b border-slate-200 bg-slate-200/30 pb-4">
              <div className="flex justify-between items-center px-1">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <History className="size-4 text-slate-500" /> Recently Studied
                </CardTitle>
                <Info className="size-3 text-slate-400" />
              </div>
            </CardHeader>
            {/* Flex-1 and overflow-hidden here allows the ResizeObserver to see the shrinking container */}
            <CardContent
              ref={masteryContainerRef}
              className="flex-1 overflow-hidden flex flex-col gap-3 p-4"
            >
              {RECENT_TOPICS.length > 0 ? (
                RECENT_TOPICS.slice(0, masteryLimit).map((item, index) => (
                  <MasteryItem key={index} {...item} />
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <BookOpen className="size-8" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. COURSE LIBRARY */}
      <Card
        className="lg:col-span-2 flex flex-col min-h-0 h-full bg-white border-slate-200 shadow-xl p-0"
        style={{
          height: "100%",
          minHeight: 0,
          overflow: "visible",
        }}
      >
        {/* Dark Flush Header */}
        <div className="bg-slate-900 px-6 py-6 shrink-0 flex items-center justify-between border-b border-slate-800 rounded-t-xl">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white m-0">
            Course Library
          </h2>
          <Link to="/courses/new">
            <Button
              variant="outline"
              size="icon"
              className="size-8 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <Plus className="size-4" />
            </Button>
          </Link>
        </div>

        {/* THE FIX: Internal Scroll Container */}
        {/* flex-1: Take up all remaining space */}
        {/* min-h-0: Allow this div to be smaller than the list inside it (REQUIRED FOR SCROLL) */}
        {/* overflow-y-auto: Show scrollbar only when needed */}
        <div
          className="custom-scrollbar"
          style={{
            height: "calc(100vh - 14rem)", // ← hard fixed height
            overflowY: "scroll", // ← force scrollbar always
            overflowX: "hidden",
          }}
        >
          <div className="p-4 space-y-3">
            {courses.length > 0 ? (
              courses.map((c) => (
                <Link
                  key={c.id}
                  to={`/courses/${c.id}`}
                  className="block group"
                >
                  <div className="flex items-center gap-4 px-4 py-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
                    <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 group-hover:scale-110 transition-transform">
                      <GraduationCap className="size-6 text-primary" />
                    </div>
                    <div className="flex flex-col overflow-hidden flex-1">
                      <span className="text-base truncate font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {c.title || c.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest truncate">
                        {c.container_tag || "SYSTEM"}
                      </span>
                    </div>
                    <ArrowRight className="size-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center opacity-40">
                <GraduationCap className="size-12 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">
                  Library Empty
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function MasteryItem({
  topic,
  score,
  warning,
}: {
  topic: string;
  score: number;
  warning: boolean;
}) {
  return (
    // Added shrink-0 and h-[68px] to prevent nodes from getting smaller
    <button className="w-full text-left p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 group flex flex-col gap-2.5 shadow-sm shrink-0 h-[68px]">
      <div className="flex justify-between items-center w-full">
        <span className="text-sm font-bold text-slate-900 flex items-center gap-2 truncate">
          {topic}
          <ArrowRight className="size-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all" />
        </span>
        <span
          className={cn(
            "text-xs font-black font-mono px-2 py-0.5 rounded shrink-0",
            warning
              ? "bg-amber-100 text-amber-700"
              : "bg-primary/10 text-primary-700",
          )}
        >
          {score}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shrink-0">
        <div
          className={cn(
            "h-full transition-all duration-700",
            warning ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </button>
  );
}
