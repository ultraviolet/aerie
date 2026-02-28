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

  const recentContentRef = useRef<HTMLDivElement>(null);
  const recentItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculate = () => {
      const container = recentContentRef.current;
      if (!container) return;

      const containerHeight = container.clientHeight;
      // Fixed height from your RecentItem (74px) + gap-3 (12px)
      const itemHeight = 74;
      const gap = 12;

      // The formula: (Total Height + Gap) / (Item Height + Gap)
      // We add one gap to the total height because the last item doesn't have a gap after it
      const fit = Math.floor((containerHeight + gap) / (itemHeight + gap));

      setRecentLimit(Math.max(1, fit));
    };

    const observer = new ResizeObserver(calculate);
    if (recentContentRef.current) observer.observe(recentContentRef.current);

    calculate(); // Initial call
    return () => observer.disconnect();
  }, [recentItems]); // Re-run if data changes

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
            <CardHeader className="shrink-0 border-b border-slate-200 pt-0 pb-6">
              <div className="flex justify-between items-center px-1">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  Recent
                </CardTitle>
                <History className="size-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent
              ref={recentContentRef}
              className="flex-1 overflow-hidden flex flex-col gap-3 px-4 pb-4 pt-0 min-h-0"
            >
              {recentItems.length > 0 ? (
                recentItems.slice(0, recentLimit).map((item, i) => (
                  <Link
                    key={item.assessment_id}
                    to={`/assessments/${item.assessment_id}`}
                    className="block no-underline"
                  >
                    <div ref={i === 0 ? recentItemRef : undefined}>
                      <RecentItem
                        topic={item.title}
                        score={item.score_pct ?? 0}
                        courseName={item.course_title}
                      />
                    </div>
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
        className="lg:col-span-2 flex flex-col h-full bg-white border-slate-200 overflow-hidden p-0 relative"
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
                      <span className="text-base truncate font-bold text-slate-900 group-hover:text-primary transition-colors font-mono">
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
 * Modernized Recent Assessment Item
 */
function RecentItem({
  topic,
  score,
  courseName,
}: {
  topic: string;
  score: number;
  courseName?: string;
}) {
  // Logic for color status based on score
  const getStatusColor = (s: number) => {
    if (s >= 90) return "bg-emerald-500";
    if (s >= 70) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="group relative bg-white border border-slate-200 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 active:scale-[0.99] cursor-pointer overflow-hidden h-[74px]">
      {/* Visual Status Indicator (Vertical line on the left) */}

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col min-w-0 gap-1">
          {/* Course Tag */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
              {courseName || "General"}
            </span>
          </div>

          {/* Assessment Title */}
          <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
            {topic}
          </h3>
        </div>

        {/* Score Badge */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black font-mono text-slate-900">
              {score}
              <span className="text-[10px] text-slate-400 ml-0.5">%</span>
            </span>
            <ArrowRight className="size-4 text-slate-300 transition-all group-hover:text-primary group-hover:translate-x-1" />
          </div>

          {/* Mini progress bar under the number */}
          <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
            <div
              className={cn("h-full rounded-full", getStatusColor(score))}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
