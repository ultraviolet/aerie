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
import type { Course, RecentAssessment } from "@/types";

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentItems, setRecentItems] = useState<RecentAssessment[]>([]);
  const recentCardRef = useRef<HTMLDivElement>(null);
  const [recentLimit, setRecentLimit] = useState(4);

  useEffect(() => {
    api.listCourses().then(setCourses).catch(console.error);
    api.recentAssessments().then(setRecentItems).catch(console.error);
  }, []);

  // Updated ResizeObserver for the slimmer 48px items

  useEffect(() => {
    const calculate = () => {
      if (!recentCardRef.current) return;
      const cardHeight = recentCardRef.current.getBoundingClientRect().height;
      const headerHeight = 57; // measure this once in devtools and hardcode it
      const padding = 16;
      const available = cardHeight - headerHeight - padding;
      const fit = Math.floor((available + 12) / (48 + 12));
      setRecentLimit(Math.max(1, fit));
    };

    const observer = new ResizeObserver(calculate);
    if (recentCardRef.current) observer.observe(recentCardRef.current);
    setTimeout(calculate, 50);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full mt-0 pb-10 min-h-0 overflow-hidden animate-in fade-in duration-700">
      {/* LEFT & CENTER STACK */}
      <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-0">
        {/* 1. STREAK GRID */}
        <Card className="bg-slate-800 border-slate-700 shadow-xl shrink-0">
          <CardContent className="py-4 flex flex-col md:flex-row items-center gap-8 text-white">
            <div className="flex items-center gap-3 shrink-0 border-r border-slate-600 pr-6">
              <div className="p-2 rounded-full bg-orange-500/20">
                <Flame className="size-6 text-orange-500" />
              </div>
              <div>
                <p className="text-xl font-black leading-none">12</p>
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
        <div
          className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden"
          style={{ minHeight: 0, overflow: "hidden" }}
        >
          <Card className="bg-white border-slate-200 flex flex-col h-full shadow-lg min-h-0">
            <CardHeader className="shrink-0 pb-4">
              <CardTitle className="text-3xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="size-8 text-primary" /> Start
              </CardTitle>
              <CardDescription className="text-slate-600 text-sm leading-relaxed">
                Access your knowledge base through dialogue or structured
                testing.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 flex-1 justify-end p-6 pt-0">
              <Button
                variant="outline"
                className="w-full bg-white border-slate-300 text-slate-900 font-bold h-14 shrink-0"
              >
                <MessageSquare className="mr-2 size-5" /> AI Chat
              </Button>
              <Button className="w-full bg-primary text-primary-foreground font-black text-xl shadow-xl hover:scale-[1.02] transition-transform flex-1 min-h-[4rem]">
                <BrainCircuit className="mr-2 size-6" /> Practice Quiz
              </Button>
            </CardContent>
          </Card>

          {/* RECENT (Renamed and Slimmed) */}
          <Card
            ref={recentCardRef}
            className="bg-slate-100 border-slate-200 flex flex-col h-full shadow-inner min-h-0"
            style={{ height: "100%", minHeight: 0 }}
          >
            <CardHeader className="shrink-0 border-b border-slate-200 bg-slate-200/30 pb-4">
              <div className="flex justify-between items-center px-1">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  Recent
                </CardTitle>
                <History className="size-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent
              className="flex-1 overflow-hidden flex flex-col gap-3 px-4 pb-4 min-h-0"
              style={{ height: "400px", paddingTop: 0 }}
            >
              {recentItems.length > 0 ? (
                recentItems.slice(0, recentLimit).map((item) => (
                  <Link
                    key={item.assessment_id}
                    to={`/assessments/${item.assessment_id}`}
                    className="block no-underline"
                  >
                    <RecentItem
                      topic={item.title}
                      score={item.score_pct ?? 0}
                    />
                  </Link>
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

      {/* 3. COURSE LIBRARY (Unchanged per request) */}
      <Card
        className="lg:col-span-2 flex flex-col h-full bg-white border-slate-200 shadow-xl overflow-hidden p-0 relative"
        style={{ height: "100%", minHeight: 0, overflow: "visible" }}
      >
        <div className="bg-slate-900 px-6 py-6 shrink-0 flex items-center justify-between border-b border-slate-800 rounded-t-xl">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white m-0">
            Course Library
          </h2>
          <Link to="/courses/new">
            <Button
              variant="outline"
              size="icon"
              className="size-8 bg-slate-600 border-slate-700 text-white hover:bg-slate-100"
            >
              <Plus className="size-4" />
            </Button>
          </Link>
        </div>
        <div
          className="custom-scrollbar"
          style={{
            height: "calc(100vh - 14rem)",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <div className="pb-4 px-4 pt-0 space-y-3">
            {courses.length > 0 ? (
              courses.map((c) => (
                <Link
                  key={c.id}
                  to={`/courses/${c.id}`}
                  className="block group"
                >
                  <div className="flex items-center gap-4 px-4 py-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
                    <div className="flex flex-col overflow-hidden flex-1">
                      <span className="text-base truncate font-bold text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tighter">
                        {c.title || c.name}
                      </span>
                    </div>
                    <ArrowRight className="size-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center opacity-40">
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

/**
 * Slim heatmap component for recent activity
 */
function RecentItem({ topic, score }: { topic: string; score: number }) {
  // NICE ORANGE: Amber-500 (#F59E0B)
  // INVERSE OPACITY: Low score (0) = 1.0 opacity | High score (100) = 0.1 opacity
  const scoreRatio = score / 110;
  const intensity = 1 - Math.pow(scoreRatio, 4);

  return (
    <button
      className={cn(
        "w-full text-left p-3 rounded-xl border flex items-center justify-between shrink-0 h-[48px] transition-all duration-200",
        // Interaction: Lift on hover, press on active
        "hover:scale-[1.01] hover:shadow-sm active:scale-[0.99] active:brightness-95",
        "group",
      )}
      style={{
        backgroundColor: `rgba(245, 158, 11, ${Math.max(intensity, 0.02)})`,
        borderColor: "rgba(245, 158, 11, 0.2)",
        cursor: "pointer",
      }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Always black font as requested */}
        <span className="text-md font-semibold text-black truncate transition-colors">
          {topic}
        </span>
        <ArrowRight className="size-4.5 text-black/80 transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-1" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[15px] font-black font-mono px-2 py-0.5 rounded-lg bg-white/50 text-black border border-black/5 shadow-sm">
          {score}%
        </span>
      </div>
    </button>
  );
}
