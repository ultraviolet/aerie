import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { Send } from "lucide-react";
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
  const [assessmentQuestionIds, setAssessmentQuestionIds] = useState<number[]>([]);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const generateVariant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setSubmission(null);
    setAnswers({});
    setMessages([]); // Reset chat on new variant
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

  // Fetch assessment question order for "Next Question" navigation
  useEffect(() => {
    if (!assessmentId) return;
    api.getAssessment(Number(assessmentId)).then((detail) => {
      setAssessmentQuestionIds(detail.questions.map((q) => q.id));
    }).catch(() => {});
  }, [assessmentId]);

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
    const currentHistory = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(currentHistory);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await api.chatAboutQuestion(variant.id, {
        message: userMsg,
        history: messages, // send previous messages (before this one)
        question_html: variant.rendered_html,
        submitted_answers: answers,
        correct_answers: submission.feedback?.correct_answers as Record<string, unknown> ?? {},
        score: submission.score,
        feedback: submission.feedback as Record<string, unknown> ?? {},
      });
      setMessages((prev) => [...prev, { role: "ai", content: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
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

  // Next question in assessment (if applicable)
  const currentIdx = assessmentQuestionIds.indexOf(Number(id));
  const nextQuestionId =
    currentIdx >= 0 && currentIdx < assessmentQuestionIds.length - 1
      ? assessmentQuestionIds[currentIdx + 1]
      : null;
  const isLastQuestion = currentIdx >= 0 && currentIdx === assessmentQuestionIds.length - 1;

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground font-medium">
        Generating variant...
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
            &larr; Back
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
        {assessmentId && assessmentQuestionIds.length > 0 && currentIdx >= 0 && (
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
          className="flex flex-col h-full bg-slate-50/30"
        >
          <div className="flex h-full flex-col min-h-0">
            {/* 1. Header (Fixed) */}
            <div className="border-b bg-slate-100/50 px-4 py-2 shrink-0">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {submission ? "Answer & Explanation" : "Problem"}
              </span>
            </div>

            {/* 2. Content Area (Scrollable) */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6">
                <QuestionContent
                  html={variant.rendered_html}
                  showAnswer={submission != null}
                  showSubmission={submission != null}
                />

                {/* Chat History renders inside the scrollable area */}
                {submission && messages.length > 0 && (
                  <div className="mt-8 space-y-4 pb-12">
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
                      <div
                        key={i}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            m.role === "user"
                              ? "bg-slate-900 text-white"
                              : "bg-white border border-slate-200 text-slate-800"
                          }`}
                        >
                          {/* Move the prose classes here to a wrapper. 
          This ensures the Markdown content is styled without 
          triggering TypeScript errors on the ReactMarkdown component.
      */}
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-800">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        </div>
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
              <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <form
                  onSubmit={handleSendMessage}
                  className="relative flex items-center max-w-3xl mx-auto w-full"
                >
                  <Input
                    placeholder={chatLoading ? "Thinking..." : "Ask a question about this problem..."}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    className="pr-10 bg-slate-50 border-slate-200 focus-visible:ring-slate-400 rounded-xl h-11"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 hover:bg-transparent"
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                  >
                    <Send className="size-4 text-slate-900" />
                  </Button>
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
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <QuestionInputs
                html={variant.rendered_html}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                disabled={submission != null}
              />

              <Separator />

              <div className="flex gap-3">
                {submission == null ? (
                  <>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 font-bold"
                    >
                      {submitting ? "Grading..." : "Submit"}
                    </Button>
                    <Button variant="outline" onClick={generateVariant}>
                      Reset
                    </Button>
                  </>
                ) : assessmentId && nextQuestionId ? (
                  <Button
                    onClick={() => navigate(`/questions/${nextQuestionId}?assessment=${assessmentId}`)}
                    className="flex-1 font-bold"
                  >
                    Next Question &rarr;
                  </Button>
                ) : assessmentId && isLastQuestion ? (
                  <Button
                    onClick={() => navigate(`/assessments/${assessmentId}`)}
                    className="flex-1 font-bold"
                  >
                    Finish Assessment
                  </Button>
                ) : (
                  <Button
                    onClick={generateVariant}
                    className="flex-1 font-bold"
                  >
                    New Variant
                  </Button>
                )}
              </div>

              {submission != null && (
                <div className="space-y-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-lg font-black ${
                      scoreVariant === "correct"
                        ? "text-green-600"
                        : scoreVariant === "partial"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {scoreVariant === "correct" && "Correct! "}
                    {scoreVariant === "partial" && "Partial Credit "}
                    {scoreVariant === "incorrect" && "Incorrect "}
                    {scorePercent}%
                  </div>
                  {submission.feedback &&
                    (submission.feedback as any).message && (
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {(submission.feedback as any).message}
                      </p>
                    )}
                </div>
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
