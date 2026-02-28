import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import type { AssessmentDetail } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const aId = Number(id);
    api.getAssessment(aId).then(setDetail).catch((e) => setError(String(e)));
    api.assessmentScores(aId).then((r) => setScores(r.scores ?? {})).catch(() => {});
  }, [id]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!detail) return <p className="text-center text-muted-foreground py-12">Loading assessment...</p>;

  const { assessment, questions } = detail;

  // Compute overall score from per-question scores
  const answeredScores = questions
    .map((q) => scores[String(q.id)])
    .filter((s): s is number => s != null);
  const overallPct = questions.length > 0 && answeredScores.length > 0
    ? Math.round((answeredScores.reduce((a, b) => a + b, 0) / questions.length) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/courses/${assessment.course_id}`}>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
            &larr; Back to course
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{assessment.type}</Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            {assessment.number ? `${assessment.number}. ` : ""}{assessment.title}
          </h1>
          {overallPct != null && (
            <span className="ml-auto text-lg font-black font-mono text-slate-700">
              {overallPct}%
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          {answeredScores.length} / {questions.length} answered
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        {questions.map((q, i) => {
          const s = scores[String(q.id)];
          const pct = s != null ? Math.round(s * 100) : null;
          return (
            <Link key={q.id} to={`/questions/${q.id}?assessment=${assessment.id}`} className="block no-underline">
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base flex-1">
                      <span className="text-muted-foreground mr-2">{i + 1}.</span>
                      {q.title}
                    </CardTitle>
                    {pct != null && (
                      <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded-md ${
                        pct >= 100 ? "bg-green-100 text-green-700" :
                        pct > 0 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    {q.topic && <span>{q.topic}</span>}
                    {q.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
