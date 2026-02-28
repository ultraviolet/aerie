import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import type { Assessment, Course, CourseDocument, Question } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const [course, setCourse] = useState<Course | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .getCourse(courseId)
      .then(setCourse)
      .catch((e) => setError(String(e)));
    api
      .listAssessments(courseId)
      .then(setAssessments)
      .catch((e) => setError(String(e)));
  }, [id, courseId]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!course)
    return (
      <p className="text-center text-muted-foreground py-12">
        Loading course...
      </p>
    );

  return (
    <div className="space-y-6">
      <div>
        <Link to="/">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground"
          >
            &larr; Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          {course.name}
        </p>
      </div>

      <Tabs defaultValue="assessments">
        <TabsList>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="mt-4">
          <AssessmentsTab assessments={assessments} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="generate" className="mt-4">
          <GenerateTab
            courseId={courseId}
            onGenerated={() => {
              api.listAssessments(courseId).then(setAssessments);
            }}
          />
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <InfoTab courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Assessments Tab ---------- */
function AssessmentsTab({ assessments }: { assessments: Assessment[] }) {
  if (assessments.length === 0) {
    return (
      <p className="text-muted-foreground">
        No assessments found for this course.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assessments.map((a) => (
        <Link
          key={a.id}
          to={`/assessments/${a.id}`}
          className="no-underline block"
        >
          {/* Added cursor-pointer to match dashboard interaction */}
          <Card className="cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Badge
                  variant="outline"
                  className="text-[10px] border-slate-700 text-slate-500 uppercase font-mono tracking-tighter"
                >
                  {a.type}
                </Badge>
                {a.score_pct != null && (
                  <span className="ml-auto text-sm font-bold font-mono text-slate-700">
                    {a.score_pct}%
                  </span>
                )}
              </div>
              <CardTitle className="text-base">
                {a.number ? `${a.number}. ` : ""}
                {a.title}
              </CardTitle>
              <CardDescription className="text-[10px] font-mono text-slate-500 tracking-tighter uppercase mt-1">
                {a.question_ids.length} question
                {a.question_ids.length !== 1 ? "s" : ""} detected
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/* ---------- Documents Tab ---------- */

function DocumentsTab({ courseId }: { courseId: number }) {
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(() => {
    api
      .listDocuments(courseId)
      .then(setDocuments)
      .catch((e) => setError(String(e)));
  }, [courseId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(courseId, file);
      }
      fetchDocs();
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      await api.deleteDocument(docId);
      fetchDocs();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.txt,.md,.docx"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <p className="text-muted-foreground">
          {uploading ? "Uploading..." : "Drop files here or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports PDF, TXT, MD, DOCX
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No documents uploaded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {doc.filename}
                    </span>
                    <Badge
                      variant={
                        doc.status === "done"
                          ? "default"
                          : doc.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs shrink-0"
                    >
                      {doc.status === "done" ? "ready" : doc.status}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Generate Tab ---------- */

function GenerateTab({
  courseId,
  onGenerated,
}: {
  courseId: number;
  onGenerated: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [contextUsed, setContextUsed] = useState<string[]>([]);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [courseTopics, setCourseTopics] = useState<string[]>([]);
  const [topicsOpen, setTopicsOpen] = useState(false);

  useEffect(() => {
    api.listDocuments(courseId).then((docs) => setDocCount(docs.length));
    api.getCourse(courseId).then((c) => setCourseTopics(c.topics ?? []));
  }, [courseId]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    setGeneratedQuestions([]);
    setContextUsed([]);
    try {
      const res = await api.generateQuestions(courseId, {
        prompt: prompt.trim(),
        topics: selectedTopics.length > 0 ? selectedTopics : undefined,
        num_questions: numQuestions,
      });
      setGeneratedQuestions(res.questions);
      setContextUsed(res.context_used);
      setHasGenerated(true);
      onGenerated();
      // Refresh course topics in case new ones were created
      api.getCourse(courseId).then((c) => setCourseTopics(c.topics ?? []));
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {docCount === 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              No documents uploaded yet. The AI will generate generic questions
              without your course materials. Upload documents in the Documents
              tab first for better results.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Generate Questions with AI
          </CardTitle>
          <CardDescription>
            Describe the kind of question you want. The AI will use your
            uploaded course documents as context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              placeholder="e.g. Generate a multiple choice question about binary search trees and their time complexity"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                  handleGenerate();
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Press Ctrl+Enter to generate
            </p>
          </div>

          {/* Topic selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Topics (optional)
            </label>
            {selectedTopics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTopics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    {t}
                    <span className="text-primary/60 ml-0.5">&times;</span>
                  </button>
                ))}
              </div>
            )}
            {courseTopics.length > 0 ? (
              <div>
                <button
                  type="button"
                  onClick={() => setTopicsOpen(!topicsOpen)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {topicsOpen ? "Hide topics" : `Choose from ${courseTopics.length} existing topic${courseTopics.length !== 1 ? "s" : ""}...`}
                </button>
                {topicsOpen && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {courseTopics
                      .filter((t) => !selectedTopics.includes(t))
                      .map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTopic(t)}
                          className="rounded-md border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          + {t}
                        </button>
                      ))}
                    {courseTopics.filter((t) => !selectedTopics.includes(t)).length === 0 && (
                      <span className="text-xs text-muted-foreground">All topics selected</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No topics yet. The AI will create topics as you generate questions.
              </p>
            )}
          </div>

          <div className="flex gap-3 items-end">
            <div className="w-24">
              <label className="text-sm font-medium mb-1 block">
                Questions
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={numQuestions}
                onChange={(e) =>
                  setNumQuestions(
                    Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Results */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Generated Questions</h3>
          {generatedQuestions.map((q) => (
            <Link
              key={q.id}
              to={`/questions/${q.id}`}
              className="block no-underline"
            >
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">AI Generated</Badge>
                    <CardTitle className="text-base">{q.title}</CardTitle>
                  </div>
                  <CardDescription>
                    {q.topic && <span>{q.topic} &middot; </span>}
                    Click to try it
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* No context warning */}
      {hasGenerated &&
        contextUsed.length === 0 &&
        generatedQuestions.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-3 px-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                No course material context was used for this question. The AI
                generated it from general knowledge. Make sure your documents
                are uploaded and have finished processing (status:
                &quot;done&quot;) in the Documents tab.
              </p>
            </CardContent>
          </Card>
        )}

      {/* Context preview */}
      {contextUsed.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Context used from your documents
          </h4>
          {contextUsed.map((chunk, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="py-3 px-4">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {chunk}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Info Tab ---------- */

function InfoTab({ courseId }: { courseId: number }) {
  const [loading, setLoading] = useState(true);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  useEffect(() => {
    api
      .getInsights(courseId)
      .then((data) => {
        setStrengths(data.strengths ?? []);
        setWeaknesses(data.weaknesses ?? []);
        setRecentActivity(data.recent_activity ?? []);
      })
      .catch(() => {
        setStrengths([]);
        setWeaknesses([]);
        setRecentActivity([]);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Loading insights...
      </p>
    );
  }

  const isEmpty =
    strengths.length === 0 &&
    weaknesses.length === 0 &&
    recentActivity.length === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            No insights yet. Complete some questions and we'll start tracking
            your strengths and weaknesses here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Strengths & Weaknesses side by side */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-green-700 dark:text-green-400">
                Strengths
              </CardTitle>
              <CardDescription>Topics you're doing well on</CardDescription>
            </CardHeader>
            <CardContent>
              {strengths.length > 0 ? (
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-green-600 dark:text-green-400 shrink-0">
                        +
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No strengths identified yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-red-700 dark:text-red-400">
                Weaknesses
              </CardTitle>
              <CardDescription>
                Topics that need more practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weaknesses.length > 0 ? (
                <ul className="space-y-2">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-red-600 dark:text-red-400 shrink-0">
                        -
                      </span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No weaknesses identified yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>
              What you've been working on lately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentActivity.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">&#8226;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
