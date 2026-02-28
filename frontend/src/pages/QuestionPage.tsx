import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "@/api";
import QuestionContent from "@/components/QuestionContent";
import QuestionInputs from "@/components/QuestionInputs";
import type { Question, Submission, Variant } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function QuestionPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");
  const [question, setQuestion] = useState<Question | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const generateVariant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setSubmission(null);
    setAnswers({});
    setError("");
    try {
      const [q, v] = await Promise.all([
        api.getQuestion(Number(id)),
        api.createVariant(Number(id)),
      ]);
      setQuestion(q);
      setVariant(v);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    generateVariant();
  }, [generateVariant]);

  const handleAnswerChange = (name: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!variant) return;
    setSubmitting(true);
    setError("");
    try {
      const sub = await api.submitAnswers(variant.id, answers);
      setSubmission(sub);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const scorePercent = submission ? ((submission.score ?? 0) * 100).toFixed(0) : null;
  const scoreVariant =
    submission == null
      ? null
      : submission.score === 1
        ? "correct"
        : (submission.score ?? 0) > 0
          ? "partial"
          : "incorrect";

  const backLink = assessmentId ? `/assessments/${assessmentId}` : "/";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Generating question variant...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">{error}</div>
    );
  }

  if (!variant) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No variant available.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Question header bar */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2">
        <Link to={backLink}>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            &larr; Back
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-5" />
        <h2 className="text-sm font-semibold truncate">{question?.title ?? "Question"}</h2>
        {question?.topic && (
          <Badge variant="outline" className="text-xs">
            {question.topic}
          </Badge>
        )}
      </div>

      {/* Split pane */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left panel — Question content / Answer explanation */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex h-full flex-col">
            <div className="border-b bg-muted/20 px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {submission ? "Answer & Explanation" : "Problem"}
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6">
                <QuestionContent
                  html={variant.rendered_html}
                  showAnswer={submission != null}
                  showSubmission={submission != null}
                />
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel — Input fields + submission */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex h-full flex-col">
            <div className="border-b bg-muted/20 px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Your Answer
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Input fields */}
                <QuestionInputs
                  html={variant.rendered_html}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                  disabled={submission != null}
                />

                <Separator />

                {/* Action buttons */}
                <div className="flex gap-3">
                  {submission == null ? (
                    <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                      {submitting ? "Grading..." : "Submit"}
                    </Button>
                  ) : (
                    <Button onClick={generateVariant} className="flex-1">
                      New Variant
                    </Button>
                  )}
                  {submission == null && (
                    <Button variant="outline" onClick={generateVariant}>
                      Reset
                    </Button>
                  )}
                </div>

                {/* Score + feedback display */}
                {submission != null && (
                  <div className="space-y-3">
                    <div
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-lg font-bold ${
                        scoreVariant === "correct"
                          ? "bg-green-100 text-green-800"
                          : scoreVariant === "partial"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {scoreVariant === "correct" && "Correct! "}
                      {scoreVariant === "partial" && "Partial Credit "}
                      {scoreVariant === "incorrect" && "Incorrect "}
                      {scorePercent}%
                    </div>

                    {submission.feedback &&
                      (submission.feedback as Record<string, string>).message && (
                        <p className="text-sm text-muted-foreground">
                          {(submission.feedback as Record<string, string>).message}
                        </p>
                      )}

                    <Button variant="outline" size="sm" onClick={generateVariant}>
                      Try Another Variant
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
