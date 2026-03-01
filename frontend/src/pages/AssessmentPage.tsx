import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import type { AssessmentDetail } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const aId = Number(id);
    api
      .getAssessment(aId)
      .then(setDetail)
      .catch((e) => setError(String(e)));
    api
      .assessmentScores(aId)
      .then((r) => setScores(r.scores ?? {}))
      .catch(() => {});
  }, [id]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!detail)
    return (
      <p className="text-center text-muted-foreground py-12">
        Loading assessment...
      </p>
    );

  const { assessment, questions } = detail;

  // Compute overall score from per-question scores
  const answeredScores = questions
    .map((q) => scores[String(q.id)])
    .filter((s): s is number => s != null);
  const overallPct =
    questions.length > 0 && answeredScores.length > 0
      ? Math.round(
          (answeredScores.reduce((a, b) => a + b, 0) / questions.length) * 100,
        )
      : null;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link to={`/courses/${assessment.course_id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground hover:bg-slate-100"
          >
            &larr; back to course
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {assessment.title}
          </h1>
          {overallPct != null && (
            <span className="ml-auto text-lg font-black font-mono text-slate-700">
              {overallPct}%
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-slate-500 mt-1">
          {answeredScores.length} / {questions.length} answered
        </p>
      </div>

      <Separator className="bg-slate-200" />

      {/* MODERN COMPACT LIST VIEW */}
      <div className="flex flex-col gap-2.5">
        {questions.map((q, i) => {
          const s = scores[String(q.id)];
          const pct = s != null ? Math.round(s * 100) : null;
          return (
            <Link
              key={q.id}
              to={`/questions/${q.id}?assessment=${assessment.id}`}
              className="block no-underline group"
            >
              {/* Block level card, perfectly isolating left content from the absolute right badge */}
              <Card className="relative block p-3 sm:px-4 py-3.5 transition-all duration-200 hover:border-primary/30 hover:shadow-sm cursor-pointer bg-white border-slate-200">
                {/* Left Side: Number Pill, Title, Tags (pr-16 prevents overlap with the absolute badge) */}
                <div className="flex items-start gap-3.5 min-w-0 pr-16 text-left">
                  {/* Modern Number Pill */}
                  <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-slate-100 text-slate-500 font-mono text-xs font-bold border border-slate-200 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-colors mt-0.5">
                    {i + 1}
                  </div>

                  {/* Title and Meta Row */}
                  <div className="flex flex-col min-w-0 gap-1.5 pt-0.5">
                    <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors leading-tight">
                      {q.title}
                    </h3>

                    {(q.topic || (q.tags && q.tags.length > 0)) && (
                      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                        {q.topic && (
                          <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest shrink-0">
                            {q.topic}
                          </span>
                        )}
                        {q.tags && q.tags.length > 0 && q.topic && (
                          <span className="text-slate-300 text-[10px] shrink-0">
                            &bull;
                          </span>
                        )}
                        {q.tags &&
                          q.tags.map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 h-4 bg-slate-100 text-slate-500 border-none font-medium shrink-0"
                            >
                              {t}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Absolute Positioned Score Badge */}
                <div className="absolute right-3 sm:right-4 top-1/4">
                  {pct != null ? (
                    <span
                      className={`text-[11px] font-black font-mono px-2.5 py-1 rounded-md border shadow-sm transition-colors ${
                        pct >= 100
                          ? "bg-green-100 text-green-700 border-green-200"
                          : pct > 0
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-red-100 text-red-700 border-red-200"
                      }`}
                    >
                      {pct}%
                    </span>
                  ) : (
                    <span className="text-[11px] font-black font-mono px-2.5 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-200 shadow-sm">
                      NEW
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
