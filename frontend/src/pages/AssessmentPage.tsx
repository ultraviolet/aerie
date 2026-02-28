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
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getAssessment(Number(id)).then(setDetail).catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!detail) return <p className="text-center text-muted-foreground py-12">Loading assessment...</p>;

  const { assessment, questions } = detail;

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
        </div>
        <p className="text-muted-foreground mt-1">
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        {questions.map((q, i) => (
          <Link key={q.id} to={`/questions/${q.id}?assessment=${assessment.id}`} className="block no-underline">
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {q.title}
                </CardTitle>
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
        ))}
      </div>
    </div>
  );
}
