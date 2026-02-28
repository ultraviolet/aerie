import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import type { Assessment, Course } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const courseId = Number(id);
    api.getCourse(courseId).then(setCourse).catch((e) => setError(String(e)));
    api.listAssessments(courseId).then(setAssessments).catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!course) return <p className="text-center text-muted-foreground py-12">Loading course...</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
            &larr; Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">{course.name}</p>
      </div>

      <Separator />

      <section>
        <h2 className="text-xl font-semibold mb-4">Assessments</h2>
        {assessments.length === 0 ? (
          <p className="text-muted-foreground">No assessments found for this course.</p>
        ) : (
          <div className="space-y-3">
            {assessments.map((a) => (
              <Link key={a.id} to={`/assessments/${a.id}`} className="block no-underline">
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{a.type}</Badge>
                      <CardTitle className="text-base">
                        {a.number ? `${a.number}. ` : ""}{a.title}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {a.question_ids.length} question{a.question_ids.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
