import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import type { Assessment, Course, CourseDocument, Question } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Topic } from "@/types"

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const [course, setCourse] = useState<Course | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [topics, setTopics] = useState<Topic[]>([])
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getCourse(courseId).then(setCourse).catch((e) => setError(String(e)));
    api.listAssessments(courseId).then(setAssessments).catch((e) => setError(String(e)));
    api.listTopics(courseId).then(setTopics);
  }, [id, courseId]);

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

      <Tabs defaultValue="assessments">
        <TabsList>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="mt-4">
          <AssessmentsTab assessments={assessments} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="topics" className="mt-4">
          <TopicsTab topics={topics} />
        </TabsContent>
        <TabsContent value="generate" className="mt-4">
          <GenerateTab
            courseId={courseId}
            onGenerated={() => {
              api.listAssessments(courseId).then(setAssessments);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Assessments Tab ---------- */

function AssessmentsTab({ assessments }: { assessments: Assessment[] }) {
  if (assessments.length === 0) {
    return <p className="text-muted-foreground">No assessments found for this course.</p>;
  }

  return (
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
  );
}

/* topics tab */ 

function TopicsTab({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return <p className="text-muted-foreground">No topics found for this course.</p>;
  }

  return (
    <div className="space-y-3">
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
    api.listDocuments(courseId).then(setDocuments).catch((e) => setError(String(e)));
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
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
        <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium truncate">{doc.filename}</span>
                    <Badge
                      variant={doc.status === "ready" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {doc.status}
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
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [contextUsed, setContextUsed] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    setGeneratedQuestions([]);
    setContextUsed([]);
    try {
      const res = await api.generateQuestions(courseId, {
        prompt: prompt.trim(),
        topic: topic.trim() || undefined,
      });
      setGeneratedQuestions(res.questions);
      setContextUsed(res.context_used);
      onGenerated();
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Questions with AI</CardTitle>
          <CardDescription>
            Describe the kind of question you want. The AI will use your uploaded course
            documents as context.
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
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Press Ctrl+Enter to generate
            </p>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Topic (optional)</label>
              <Input
                placeholder="e.g. Data Structures"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
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
            <Link key={q.id} to={`/questions/${q.id}`} className="block no-underline">
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">AI Generated</Badge>
                    <CardTitle className="text-base">{q.title}</CardTitle>
                  </div>
                  {/* <CardDescription>
                    {q.topic && <span>{q.topic} &middot; </span>}
                    Click to try it
                  </CardDescription> */}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Context preview */}
      {contextUsed.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Context used from your documents</h4>
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
