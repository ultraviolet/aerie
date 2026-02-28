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
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { api } from "@/api";
import type { Course } from "@/types";

// Extracted to an array so we can dynamically slice it based on screen height
const MASTERY_TOPICS = [
  { topic: "NFA Sim", score: 88, warning: false },
  { topic: "Fooling Sets", score: 42, warning: true },
  { topic: "Pumping Lemma", score: 71, warning: false },
  { topic: "CFG Grammars", score: 92, warning: false },
  { topic: "Regex Parser", score: 31, warning: true },
  { topic: "DFA Minimization", score: 65, warning: false },
  { topic: "Pushdown Automata", score: 78, warning: false },
  { topic: "Turing Machines", score: 54, warning: false },
  { topic: "Chomsky Normal Form", score: 85, warning: false },
];

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const masteryContainerRef = useRef<HTMLDivElement>(null);
  const [masteryLimit, setMasteryLimit] = useState(4); // Fallback until measurement happens

  useEffect(() => {
    api.listCourses().then(setCourses).catch(console.error);
  }, []);

  // Dynamically calculate how many Mastery items fit without clipping
  useEffect(() => {
    if (!masteryContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const containerHeight = entries[0].contentRect.height;
      const itemHeight = 68; // 68px exact height of MasteryItem
      const gap = 12; // 12px gap (gap-3)

      // Calculate how many items fit (adding one gap to container height to account for the lack of gap after the final item)
      const fit = Math.floor((containerHeight + gap) / (itemHeight + gap));
      setMasteryLimit(fit > 0 ? fit : 0);
    });

    observer.observe(masteryContainerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-8rem)] min-h-0 overflow-hidden animate-in fade-in duration-700">
      {/* LEFT & CENTER STACK (3/5 Width) */}
      <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-0 overflow-hidden">
        {/* 1. STREAK GRID (GRAY BG, WHITE TEXT) */}
        <Card className="bg-slate-800 border-slate-700 shadow-xl shrink-0">
          <CardContent className="py-4 flex flex-col md:flex-row items-center gap-8">
            <div className="flex items-center gap-3 shrink-0 border-r border-slate-600 pr-6">
              <div className="p-2 rounded-full bg-orange-500/20">
                <Flame className="size-6 text-orange-500" />
              </div>
              <div>
                <p className="text-xl font-black text-white leading-none">12</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                  Current Streak
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
                      className="size-3.5 rounded-[2px]"
                      style={{
                        backgroundColor: isActive
                          ? `rgba(249, 115, 22, ${intensity})`
                          : "rgba(51, 65, 85, 1)",
                        border: isActive
                          ? "1px solid rgba(249, 115, 22, 0.4)"
                          : "1px solid rgba(71, 85, 105, 1)",
                      }}
                    />
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-300 mt-2 font-mono uppercase tracking-widest">
                Last 4 Weeks Activity
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. MAIN INTERACTIVE AREA */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden">
          {/* START SESSION (WHITE BG, BLACK TEXT) */}
          <Card className="bg-white border-slate-200 flex flex-col h-full shadow-lg shrink-0 min-h-0 overflow-hidden">
            <CardHeader className="shrink-0 pb-4">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="size-8 text-primary" /> Start
                </CardTitle>
                <CardDescription className="text-slate-600 text-sm font-medium leading-relaxed">
                  Ready to evolve your understanding? Access your knowledge base
                  through dialogue or structured testing.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 flex-1 justify-end p-6 pt-0 min-h-0">
              <Button
                variant="outline"
                className="w-full bg-white border-slate-300 text-slate-900 font-bold text-lg hover:bg-slate-50 h-14 shrink-0"
              >
                <MessageSquare className="mr-2 size-5" /> AI Chat
              </Button>
              <Button className="w-full bg-primary text-primary-foreground font-black text-xl shadow-xl hover:scale-[1.02] transition-transform flex-1 min-h-[4rem]">
                <BrainCircuit className="mr-2 size-6" /> Practice Quiz
              </Button>
            </CardContent>
          </Card>

          {/* MASTERY FEED (GRAY BG, WHITE TEXT, DYNAMIC FIT NO-CLIP) */}
          <Card className="bg-slate-800 border-slate-700 flex flex-col h-full shadow-lg min-h-0 overflow-hidden">
            <CardHeader className="shrink-0 border-b border-slate-700 pb-4 bg-slate-800/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <History className="size-4 text-slate-300" /> Mastery
                </CardTitle>
                <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                  <Info className="size-3" /> Click topic to review
                </span>
              </div>
            </CardHeader>
            <CardContent
              ref={masteryContainerRef}
              className="flex-1 overflow-hidden flex flex-col gap-3 p-4 min-h-0"
            >
              {MASTERY_TOPICS.slice(0, masteryLimit).map((item, index) => (
                <MasteryItem
                  key={index}
                  topic={item.topic}
                  score={item.score}
                  warning={item.warning}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. WIDE COURSE LIBRARY (WHITE BG, BLACK TEXT, SCROLLABLE) */}
      <Card className="lg:col-span-2 h-full bg-white border-slate-200 flex flex-col shadow-xl min-h-0 overflow-hidden">
        <CardHeader className="shrink-0 border-b border-slate-100 bg-slate-50/80 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">
              Course Library
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              className="size-8 bg-white border-slate-200 text-slate-900 hover:bg-slate-100 hover:text-primary transition-all rounded-lg"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </CardHeader>
        {/* Scrollable list area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 min-h-0">
          {courses.map((c) => (
            <Link key={c.id} to={`/courses/${c.id}`} className="block group">
              <div className="flex items-center gap-4 px-4 py-4 rounded-xl bg-white hover:bg-slate-50 transition-all border border-slate-200 hover:border-primary/50 shadow-sm hover:shadow-md cursor-pointer">
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 group-hover:scale-110 transition-transform">
                  <GraduationCap className="size-6 text-primary" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-base truncate font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {c.title || c.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                    {c.container_tag || "SYSTEM"}
                  </span>
                </div>
                <ArrowRight className="size-5 ml-auto text-slate-400 group-hover:text-primary transition-all group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* --- UI Helpers --- */

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
    <button className="w-full text-left p-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 transition-all border border-slate-600 hover:border-slate-400 group flex flex-col gap-2.5 shadow-sm shrink-0 h-[68px]">
      <div className="flex justify-between items-center w-full">
        <span className="text-sm font-bold text-white group-hover:text-white transition-colors flex items-center gap-2 leading-none">
          {topic}
          <ArrowRight className="size-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-white transition-all -translate-x-2 group-hover:translate-x-0" />
        </span>
        <span
          className={cn(
            "text-xs font-black font-mono px-2 py-0.5 rounded leading-none",
            warning
              ? "bg-amber-500/20 text-amber-400"
              : "bg-primary/20 text-primary-100",
          )}
        >
          {score}%
        </span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 shrink-0">
        <div
          className={cn(
            "h-full transition-all duration-1000 ease-out",
            warning ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </button>
  );
}
