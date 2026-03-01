"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, History, ArrowRight, Flame, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/api";
import type { Course, RecentAssessment } from "@/types";
import CreateCourseForm from "@/components/elements/CreateCourseForm";

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentItems, setRecentItems] = useState<RecentAssessment[]>([]);
  const recentCardRef = useRef<HTMLDivElement>(null);
  const [recentLimit, setRecentLimit] = useState(4);

  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [streak, setStreak] = useState(0);
  const [streakDays, setStreakDays] = useState<
    { date: string; count: number }[]
  >([]);

  useEffect(() => {
    api.listCourses().then(setCourses).catch(console.error);
    api.recentAssessments().then(setRecentItems).catch(console.error);
    api
      .getStreak()
      .then((data) => {
        setStreak(data.current_streak);
        setStreakDays(data.days);
      })
      .catch(console.error);
  }, []);

  // Dynamically calculate how many recent items fit in the card.
  // We measure the *card* height (stable from grid layout) and subtract
  // the header, so item count changes don't feed back into the measurement.

  useEffect(() => {
    const calculate = () => {
      const card = recentCardRef.current;
      if (!card) return;

      // Measure CardContent's top offset from the card to account for
      // all padding/gaps/header automatically instead of hardcoding.
      const content = card.querySelector("[data-recent-content]");
      if (!content) return;

      const cardRect = card.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const contentTop = contentRect.top - cardRect.top;
      const contentPadBottom = 16; // pb-4
      const available = card.clientHeight - contentTop - contentPadBottom;

      const itemHeight = 74; // h-[74px] on RecentItem
      const gap = 12; // gap-3
      const fit = Math.floor((available + gap) / (itemHeight + gap));

      setRecentLimit(Math.max(1, fit));
    };

    const observer = new ResizeObserver(calculate);
    if (recentCardRef.current) observer.observe(recentCardRef.current);
    calculate();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full mt-0 pb-10 min-h-0 overflow-hidden animate-in fade-in duration-700">
      {/* LEFT & CENTER STACK */}
      <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-0">
        {/* 1. STREAK GRID */}
        <Card className="bg-slate-600 border-slate-500 shrink-0 shadow-none">
          <CardContent className="py-4 flex flex-col md:flex-row items-center gap-8 text-white">
            <div className="flex items-center gap-3 shrink-0 border-r border-slate-400/40 pr-6">
              <div className="p-2 rounded-full bg-orange-500/50">
                <Flame className="size-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-black leading-none text-white text-shadow-lg">
                  {streak}
                </p>
                <p className="text-[12px] font-bold text-white/90 uppercase tracking-tighter text-shadow-lg">
                  Current Streak
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex flex-wrap gap-1.5">
                {(streakDays.length > 0
                  ? streakDays
                  : Array.from({ length: 28 }, () => ({ date: "", count: 0 }))
                ).map((day, i) => {
                  const maxCount = Math.max(
                    1,
                    ...streakDays.map((d) => d.count),
                  );
                  const intensity =
                    day.count > 0 ? Math.max(0.2, day.count / maxCount) : 0;
                  return (
                    <div
                      key={i}
                      className="size-3.5 rounded-[2px] border"
                      title={
                        day.date
                          ? `${day.date}: ${day.count} submission${day.count !== 1 ? "s" : ""}`
                          : ""
                      }
                      style={{
                        backgroundColor:
                          day.count > 0
                            ? `rgba(249, 115, 22, ${intensity})`
                            : "rgba(148, 163, 184, 0.25)",
                        borderColor:
                          day.count > 0
                            ? "rgba(249, 115, 22, 1)"
                            : "rgba(148, 163, 184, 1)",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. COURSE LIBRARY (full width of left column) */}
        <Card className="flex-1 flex flex-col bg-transparent border-2 border-slate-300 overflow-hidden p-0 relative min-h-0 [&>div]:flex-1 [&>div]:min-h-0 [&>div]:gap-0 shadow-none">
          <div className="px-6 py-5 shrink-0 flex items-center justify-between border-b-2 border-slate-300 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg border border-slate-300">
                <BookOpen className="size-4 text-slate-500" />
              </div>
              <h2 className="text-md font-black uppercase tracking-[0.2em] text-slate-800 m-0">
                Course Library
              </h2>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-8 border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setShowCreateCourse(true)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 custom-scrollbar">
            <div className="divide-y divide-slate-200">
              {courses.length > 0 ? (
                courses.map((c) => (
                  <Link
                    key={c.id}
                    to={`/courses/${c.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col overflow-hidden flex-1">
                        <span className="text-base truncate font-semibold text-slate-800 group-hover:text-slate-600 transition-colors font-mono">
                          {c.title || c.name}
                        </span>
                      </div>
                      <ArrowRight className="size-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center opacity-40">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Library Empty
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 3. RECENT (right column) */}
      <Card
        ref={recentCardRef}
        className="lg:col-span-2 flex flex-col h-full border-2 bg-slate-400 border-slate-300 overflow-hidden min-h-0 [&>div]:flex-1 [&>div]:min-h-0 [&>div]:gap-0 pt-0 shadow-none"
        style={{ height: "100%", minHeight: 0 }}
      >
        <div
          data-recent-header
          className="px-6 py-5 shrink-0 flex items-center justify-between border-b-2 border-slate-300"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg border border-slate-300">
              <History className="size-4 text-white/90" />
            </div>
            <h2 className="text-md font-black uppercase tracking-[0.2em] text-white/90 text-shadow-xl m-0">
              Recent
            </h2>
          </div>
        </div>
        <CardContent
          data-recent-content
          className="flex-1 overflow-hidden flex flex-col gap-3 px-4 pb-4 pt-3 min-h-0"
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
                  courseName={item.course_title}
                />
              </Link>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <BookOpen className="size-8 text-slate-400" />
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateCourse && (
        <CreateCourseForm
          onClose={() => {
            setShowCreateCourse(false);
            api.listCourses().then(setCourses).catch(console.error);
          }}
        />
      )}
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
  const getStatusColor = (s: number) => {
    if (s >= 90) return "bg-emerald-500";
    if (s >= 70) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getScoreTextColor = (s: number) => {
    if (s >= 90) return "text-emerald-600";
    if (s >= 70) return "text-amber-600";
    return "text-rose-600";
  };

  return (
    <div
      className="group relative border border-slate-300 rounded-md p-4 transition-all duration-150 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] cursor-pointer overflow-hidden h-[74px]"
      style={{ background: "#b8c8db" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col min-w-0 gap-1">
          {/* Course Tag */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">
              {courseName || "General"}
            </span>
          </div>

          {/* Assessment Title */}
          <h3 className="text-md font-bold font-mono text-black truncate group-hover:text-white transition-colors font-shadow-xl">
            {topic}
          </h3>
        </div>

        {/* Score Badge */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-lg font-black font-mono",
                getScoreTextColor(score),
              )}
            >
              {score}
              <span className="text-[10px] text-slate-500 ml-0.5">%</span>
            </span>
            <ArrowRight className="size-4 text-slate-500 transition-all group-hover:text-slate-500 group-hover:translate-x-1" />
          </div>

          {/* Mini progress bar under the number */}
          <div className="w-12 h-1 bg-slate-400 rounded-sm mt-1 overflow-hidden">
            <div
              className={cn("h-full rounded-sm", getStatusColor(score))}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
