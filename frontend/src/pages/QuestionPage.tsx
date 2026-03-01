import { useCallback, useEffect, useState, useRef } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api } from "@/api";
import QuestionContent from "@/components/QuestionContent";
import QuestionInputs from "@/components/QuestionInputs";
import type { Question, Submission, Variant } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Image, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

export default function QuestionPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [assessmentQuestionIds, setAssessmentQuestionIds] = useState<number[]>(
    [],
  );

  const [generatingSimilar, setGeneratingSimilar] = useState(false);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string; image?: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  const loadQuestion = useCallback(async () => {
    if (!id) return;
    // Abort any in-flight chat request
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    setLoading(true);
    setSubmission(null);
    setAnswers({});
    setMessages([]);
    setChatLoading(false);
    setError("");
    try {
      // Fetch question + assessment order in parallel
      const qPromise = api.getQuestion(Number(id));
      const attemptPromise = api.lastAttempt(Number(id));
      const assessmentPromise = assessmentId
        ? api.getAssessment(Number(assessmentId))
        : null;

      const [q, attempt, assessmentDetail] = await Promise.all([
        qPromise,
        attemptPromise,
        assessmentPromise,
      ]);

      setQuestion(q);

      if (assessmentDetail) {
        setAssessmentQuestionIds(assessmentDetail.questions.map((aq) => aq.id));
      }

      if (attempt.variant && attempt.submission) {
        setVariant(attempt.variant);
        setSubmission(attempt.submission);
        setAnswers(
          (attempt.submission.submitted_answers as Record<string, unknown>) ??
            {},
        );
      } else {
        // No previous attempt — create a new variant
        const v = await api.createVariant(Number(id));
        setVariant(v);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id, assessmentId]);

  const generateNewVariant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setSubmission(null);
    setAnswers({});
    setMessages([]);
    setError("");
    try {
      const v = await api.createVariant(Number(id));
      setVariant(v);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

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

  const [chatLoading, setChatLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !variant || !submission) return;

    const userMsg = chatInput;
    const currentHistory = [
      ...messages,
      { role: "user" as const, content: userMsg },
    ];
    setMessages(currentHistory);
    setChatInput("");
    setChatLoading(true);

    // Abort any previous in-flight chat request
    if (chatAbortRef.current) chatAbortRef.current.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;

    try {
      const res = await api.chatAboutQuestion(variant.id, {
        message: userMsg,
        history: messages, // send previous messages (before this one)
        question_html: variant.rendered_html,
        submitted_answers: answers,
        correct_answers:
          (submission.feedback?.correct_answers as Record<string, unknown>) ??
          {},
        score: submission.score,
        feedback: (submission.feedback as Record<string, unknown>) ?? {},
        course_id: question?.course_id ?? null,
      }, controller.signal);
      setMessages((prev) => [...prev, { role: "ai", content: res.reply, image: res.image ?? undefined }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // <-- This stops the whole page from shifting up
      });
    }
  }, [messages]);

  const scorePercent = submission
    ? ((submission.score ?? 0) * 100).toFixed(0)
    : null;
  const scoreVariant =
    submission == null
      ? null
      : submission.score === 1
        ? "correct"
        : (submission.score ?? 0) > 0
          ? "partial"
          : "incorrect";
  const backLink = assessmentId ? `/assessments/${assessmentId}` : "/";

  const handleGenerateSimilar = async () => {
    if (!id) return;
    setGeneratingSimilar(true);
    setError("");
    try {
      const result = await api.generateSimilar(Number(id));
      const newAssessmentId = result.assessment_id ?? assessmentId;
      const query = newAssessmentId ? `?assessment=${newAssessmentId}` : "";
      navigate(`/questions/${result.question.id}${query}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setGeneratingSimilar(false);
    }
  };

  // Next question in assessment (if applicable)
  const currentIdx = assessmentQuestionIds.indexOf(Number(id));
  const nextQuestionId =
    currentIdx >= 0 && currentIdx < assessmentQuestionIds.length - 1
      ? assessmentQuestionIds[currentIdx + 1]
      : null;
  const isLastQuestion =
    currentIdx >= 0 && currentIdx === assessmentQuestionIds.length - 1;

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground font-medium">
        loading...
      </div>
    );
  if (error)
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        {error}
      </div>
    );
  if (!variant)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No variant available.
      </div>
    );

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-white/50 backdrop-blur px-4 py-2 shrink-0">
        <Link to={backLink}>
          <Button variant="ghost" size="sm">
            &larr; back
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-5" />
        <h2 className="text-sm font-bold truncate text-slate-900">
          {question?.title ?? "Question"}
        </h2>
        {question?.topic && (
          <Badge variant="secondary" className="font-mono text-[10px]">
            {question.topic}
          </Badge>
        )}
        {assessmentId &&
          assessmentQuestionIds.length > 0 &&
          currentIdx >= 0 && (
            <span className="text-xs text-muted-foreground ml-auto font-mono">
              {currentIdx + 1} / {assessmentQuestionIds.length}
            </span>
          )}
      </div>

      <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
        {/* Left Panel: Content + Chat */}
        <ResizablePanel
          defaultSize={50}
          minSize={30}
          className="flex flex-col h-full bg-slate-50/30 overflow-hidden"
        >
          <div className="flex h-full flex-col min-h-0 min-w-0 overflow-hidden">
            {/* 1. Header (Fixed) */}
            <div className="border-b bg-slate-100/50 px-4 py-2 shrink-0">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {submission ? "Answer & Explanation" : "Problem"}
              </span>
            </div>

            {/* 2. Content Area (Scrollable) */}
            <ScrollArea className="flex-1 min-h-0 min-w-0">
              <div className="p-6 min-w-0 overflow-hidden break-words">
                <QuestionContent
                  html={variant.rendered_html}
                  showAnswer={submission != null}
                  showSubmission={submission != null}
                />

                {/* Fallback explanation when HTML has no <pl-answer-panel> */}
                {submission != null &&
                  !variant.rendered_html
                    .toLowerCase()
                    .includes("<pl-answer-panel>") && (
                    <div className="mt-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 overflow-hidden min-w-0">
                      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                        <div className="size-8 rounded-full flex items-center justify-center bg-green-100 text-green-600 text-sm shrink-0">
                          &#x2713;
                        </div>
                        <p className="text-sm font-black uppercase tracking-wide text-green-800">
                          Answer & Explanation
                        </p>
                      </div>
                      <div className="px-5 pb-5 text-sm text-green-900/90 leading-relaxed space-y-1">
                        {Object.entries(variant.correct_answers).map(
                          ([key, val]) => (
                            <p key={key}>
                              <strong>{key}:</strong>{" "}
                              {Array.isArray(val)
                                ? val.join(", ")
                                : String(val)}
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Chat History renders inside the scrollable area */}
                {submission && messages.length > 0 && (
                  <div className="mt-8 space-y-4 pb-12 min-w-0 overflow-hidden">
                    <Separator className="my-8" />
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1 rounded bg-primary/10 text-primary">
                        <Send className="size-3" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Discussion
                      </span>
                    </div>
                    {messages.map((m, i) => (
                      <div key={i}>
                        {m.role === "user" ? (
                          <div className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm bg-slate-900 text-white overflow-hidden">
                              <div className="prose prose-sm max-w-none prose-invert prose-p:leading-relaxed overflow-hidden break-words [&_code]:before:content-none [&_code]:after:content-none [&_code]:bg-white/15 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em]">
                                <ReactMarkdown
                                  remarkPlugins={[remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                >
                                  {m.content}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full min-w-0 rounded-2xl px-4 py-2 text-sm shadow-sm bg-white border border-slate-200 text-slate-800 overflow-hidden">
                            <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-pre:overflow-x-auto overflow-hidden break-words [&_code]:before:content-none [&_code]:after:content-none [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-slate-800 [&_code]:text-[0.9em]">
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {m.content}
                              </ReactMarkdown>
                            </div>
                            {m.image && (
                              <img
                                src={m.image}
                                alt="Diagram"
                                className="mt-2 max-w-full rounded-lg border border-slate-200"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl px-4 py-2 bg-white border border-slate-200 text-slate-400 text-sm shadow-sm">
                          Thinking...
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* 3. Fixed Chat Input (Outside ScrollArea, at bottom of Panel) */}
            {submission && (
              <div className="p-4 bg-white border-t border-slate-100 shrink-0 mt-auto">
                <form
                  onSubmit={handleSendMessage}
                  className="relative flex items-center w-full"
                >
                  <Input
                    placeholder={
                      chatLoading
                        ? "Thinking..."
                        : "Ask about this problem, or request a diagram..."
                    }
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    className="pr-20 bg-slate-50 border-slate-200 focus-visible:ring-slate-400 rounded-xl h-11"
                  />
                  <div className="absolute right-1 flex items-center gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      type="button"
                      className="hover:bg-slate-100"
                      disabled={chatLoading}
                      onClick={() => {
                        setChatInput("Draw a diagram to help me understand this");
                      }}
                      title="Request a diagram"
                    >
                      <Image className="size-4 text-slate-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:bg-transparent"
                      type="submit"
                      disabled={!chatInput.trim() || chatLoading}
                    >
                      <Send className="size-4 text-slate-900" />
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Inputs */}
        <ResizablePanel
          defaultSize={50}
          minSize={30}
          className="flex flex-col h-full bg-white"
        >
          <div className="border-b bg-slate-50/50 px-4 py-2 shrink-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Your Answer
            </span>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-6">
              <QuestionInputs
                html={variant.rendered_html}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                disabled={submission != null}
                params={variant.params}
              />

              {submission != null && (
                <div className="space-y-4">
                  {/* Score banner */}
                  <div
                    className={`rounded-xl p-5 ${
                      scoreVariant === "correct"
                        ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200"
                        : scoreVariant === "partial"
                          ? "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"
                          : "bg-gradient-to-br from-red-50 to-rose-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-10 rounded-full flex items-center justify-center text-lg ${
                            scoreVariant === "correct"
                              ? "bg-green-100 text-green-600"
                              : scoreVariant === "partial"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-red-100 text-red-600"
                          }`}
                        >
                          {scoreVariant === "correct"
                            ? "\u2713"
                            : scoreVariant === "partial"
                              ? "\u00BD"
                              : "\u2717"}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-black uppercase tracking-wide ${
                              scoreVariant === "correct"
                                ? "text-green-800"
                                : scoreVariant === "partial"
                                  ? "text-amber-800"
                                  : "text-red-800"
                            }`}
                          >
                            {scoreVariant === "correct" && "Correct"}
                            {scoreVariant === "partial" && "Partial Credit"}
                            {scoreVariant === "incorrect" && "Incorrect"}
                          </p>
                          {submission.feedback &&
                            (submission.feedback as any).message && (
                              <p
                                className={`text-xs mt-0.5 leading-relaxed ${
                                  scoreVariant === "correct"
                                    ? "text-green-700/80"
                                    : scoreVariant === "partial"
                                      ? "text-amber-700/80"
                                      : "text-red-700/80"
                                }`}
                              >
                                {(submission.feedback as any).message}
                              </p>
                            )}
                        </div>
                      </div>
                      <div
                        className={`text-3xl font-black tabular-nums ${
                          scoreVariant === "correct"
                            ? "text-green-600"
                            : scoreVariant === "partial"
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {scorePercent}%
                      </div>
                    </div>
                  </div>

                  {/* Code test results */}
                  {(submission.feedback as any)?.test_results?.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Test Results
                      </p>
                      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                        {(
                          (submission.feedback as any).test_results as Array<{
                            index: number;
                            passed: boolean;
                            actual?: string;
                            expected?: string;
                            error?: string;
                            description?: string;
                          }>
                        ).map((r, i, arr) => (
                          <div
                            key={r.index}
                            className={`px-3.5 py-2.5 flex items-start gap-3 ${
                              i !== arr.length - 1
                                ? "border-b border-slate-100"
                                : ""
                            }`}
                          >
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded ${
                                r.passed
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {r.passed ? "PASS" : "FAIL"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-800">
                                {r.description || `Test ${r.index + 1}`}
                              </span>
                              {!r.passed && (
                                <div className="font-mono text-xs mt-1.5 text-red-600/90 bg-red-50 rounded px-2 py-1">
                                  {r.error ||
                                    `Expected ${r.expected}, got ${r.actual}`}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {(submission.feedback as any).hidden_summary && (
                        <p className="text-xs text-muted-foreground italic">
                          {(submission.feedback as any).hidden_summary}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Fixed action buttons — always visible at bottom */}
          <div className="px-4 pt-4 pb-6 bg-white border-t border-slate-100 shrink-0">
            <div className="flex flex-col gap-2">
              {submission == null ? (
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 font-bold"
                  >
                    {submitting ? "grading..." : "submit"}
                  </Button>
                  <Button variant="outline" onClick={generateNewVariant}>
                    clear
                  </Button>
                </div>
              ) : (
                <>
                  {assessmentId && nextQuestionId ? (
                    <Button
                      onClick={() =>
                        navigate(
                          `/questions/${nextQuestionId}?assessment=${assessmentId}`,
                        )
                      }
                      className="w-full font-bold"
                    >
                      next question &rarr;
                    </Button>
                  ) : assessmentId && isLastQuestion ? (
                    <Button
                      onClick={() => navigate(`/assessments/${assessmentId}`)}
                      className="w-full font-bold"
                    >
                      finish assessment
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={handleGenerateSimilar}
                    disabled={generatingSimilar}
                    className="w-full text-muted-foreground"
                  >
                    {generatingSimilar
                      ? "generating..."
                      : "generate similar question"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
