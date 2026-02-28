import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
import {
  LayoutGrid,
  List,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const courseId = Number(id);
  const [course, setCourse] = useState<Course | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [error, setError] = useState("");

  // Editing & Deletion State
  const [isEditingName, setIsEditingName] = useState(false);
  const [isConfirmingEdit, setIsConfirmingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleSaveName = async () => {
    if (!editName.trim() || editName === course?.name) {
      setIsEditingName(false);
      setIsConfirmingEdit(false);
      return;
    }

    setIsProcessing(true);
    try {
      await api.updateCourse(courseId, { title: editName });
      const updated = await api.getCourse(courseId);
      setCourse(updated);
      setIsEditingName(false);
      setIsConfirmingEdit(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCourse = async () => {
    setIsProcessing(true);
    try {
      await api.deleteCourse(courseId);
      navigate("/");
    } catch (e) {
      setError(String(e));
      setIsProcessing(false);
    }
  };

  if (error) return <p className="text-destructive">{error}</p>;
  if (!course)
    return (
      <p className="text-center text-muted-foreground py-12">
        Loading course...
      </p>
    );

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-12">
      {/* Prominent Left-Aligned Course Header */}
      <div className="mb-8 border-b border-slate-200 pb-8 pt-4 group min-h-[140px]">
        <Link to="/">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 text-slate-500 hover:text-slate-900"
          >
            &larr; Back to dashboard
          </Button>
        </Link>
        <div className="flex flex-col gap-1 w-full">
          <Badge
            variant="secondary"
            className="w-fit font-mono text-[10px] uppercase tracking-widest mb-1"
          >
            Course Overview
          </Badge>

          {/* INLINE DELETE CONFIRMATION */}
          {isConfirmingDelete ? (
            <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-red-800 font-bold text-lg">
                <AlertCircle className="size-5" /> Delete "{course.name}"?
              </div>
              <p className="text-sm text-red-600/90 font-medium">
                This action cannot be undone. All materials, documents, and
                performance history will be permanently wiped.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteCourse}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Deleting..." : "Yes, completely delete"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isProcessing}
                  className="text-red-700 hover:text-red-800 hover:bg-red-100"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : // INLINE EDITING STATE
          isEditingName ? (
            <div className="flex flex-col gap-3 mt-1 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="max-w-md text-2xl font-black h-12 bg-white"
                  autoFocus
                  disabled={isProcessing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsConfirmingEdit(true);
                    if (e.key === "Escape") {
                      setIsEditingName(false);
                      setIsConfirmingEdit(false);
                    }
                  }}
                />

                {/* INLINE EDIT CONFIRMATION */}
                {!isConfirmingEdit ? (
                  <>
                    <Button
                      onClick={() => setIsConfirmingEdit(true)}
                      className="font-bold h-12 px-6"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditingName(false);
                        setEditName(course.name);
                      }}
                      variant="ghost"
                      className="h-12"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-3 bg-amber-50 px-4 py-1.5 rounded-lg border border-amber-200 animate-in slide-in-from-left-4 duration-200">
                    <span className="text-sm font-bold text-amber-800 whitespace-nowrap">
                      Apply changes?
                    </span>
                    <Button
                      onClick={handleSaveName}
                      size="sm"
                      disabled={isProcessing}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {isProcessing ? "Saving..." : "Yes"}
                    </Button>
                    <Button
                      onClick={() => setIsConfirmingEdit(false)}
                      size="sm"
                      variant="ghost"
                      disabled={isProcessing}
                      className="text-amber-700 hover:bg-amber-100"
                    >
                      No
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // DEFAULT HEADER STATE
            <div className="flex items-center justify-between w-full">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 truncate pr-4">
                {course.name}
              </h1>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditName(course.name);
                    setIsEditingName(true);
                  }}
                  className="text-slate-600 bg-white"
                >
                  <Pencil className="size-3.5 mr-1.5" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  <Trash2 className="size-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="materials">
        {/* Equal padding and spacing for Tabs */}
        <TabsList className="mb-2 flex h-auto w-fit gap-2 p-1.5 bg-slate-100/80 rounded-lg">
          <TabsTrigger value="materials" className="px-8 py-2 font-medium">
            Materials
          </TabsTrigger>
          <TabsTrigger value="documents" className="px-8 py-2 font-medium">
            Documents
          </TabsTrigger>
          <TabsTrigger value="info" className="px-8 py-2 font-medium">
            Info
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="materials"
          className="mt-4 focus-visible:outline-none"
        >
          <MaterialsTab
            courseId={courseId}
            materials={assessments}
            onRefresh={() => api.listAssessments(courseId).then(setAssessments)}
          />
        </TabsContent>

        <TabsContent
          value="documents"
          className="mt-4 focus-visible:outline-none"
        >
          <DocumentsTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="info" className="mt-4 focus-visible:outline-none">
          <InfoTab courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Materials Tab (Replaces Assessments & Generate) ---------- */
function MaterialsTab({
  courseId,
  materials,
  onRefresh,
}: {
  courseId: number;
  materials: Assessment[];
  onRefresh: () => void;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isGenerating, setIsGenerating] = useState(false);

  // If the user clicks "Add New Material", swap the view entirely
  if (isGenerating) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <Button
          variant="ghost"
          onClick={() => setIsGenerating(false)}
          className="-ml-4 text-slate-500 hover:text-slate-900"
        >
          &larr; Back to Materials List
        </Button>
        <GenerateMaterialView courseId={courseId} onGenerated={onRefresh} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toolbar: Toggle View & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className={`h-8 px-3 ${viewMode === "grid" ? "shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="size-4 mr-2" /> Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className={`h-8 px-3 ${viewMode === "list" ? "shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            onClick={() => setViewMode("list")}
          >
            <List className="size-4 mr-2" /> List
          </Button>
        </div>

        <Button
          onClick={() => setIsGenerating(true)}
          className="font-bold shadow-md"
        >
          <Plus className="size-4 mr-2" /> Add New Material
        </Button>
      </div>

      {materials.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-muted-foreground text-sm font-medium mb-4">
            No materials found for this course.
          </p>
          <Button variant="outline" onClick={() => setIsGenerating(true)}>
            <Plus className="size-4 mr-2" /> Generate First Material
          </Button>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "flex flex-col gap-3"
          }
        >
          {materials.map((m) => (
            <Link
              key={m.id}
              to={`/assessments/${m.id}`}
              className="no-underline block group"
            >
              <Card
                className={`cursor-pointer transition-all hover:border-primary/30 hover:shadow-md ${viewMode === "grid" ? "h-full" : "flex flex-row items-center justify-between p-4"}`}
              >
                {viewMode === "grid" ? (
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-300 text-slate-500 uppercase font-mono tracking-tighter bg-slate-50 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-colors"
                      >
                        {m.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {m.number ? `${m.number}. ` : ""}
                      {m.title}
                    </CardTitle>
                    <CardDescription className="text-[10px] font-mono text-slate-500 tracking-tighter uppercase mt-1">
                      {m.question_ids.length} question
                      {m.question_ids.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                ) : (
                  // List View Layout
                  <>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-300 text-slate-500 uppercase font-mono tracking-tighter bg-slate-50 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-colors shrink-0"
                      >
                        {m.type}
                      </Badge>
                      <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm sm:text-base">
                        {m.number ? `${m.number}. ` : ""}
                        {m.title}
                      </h3>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest shrink-0">
                      {m.question_ids.length} question
                      {m.question_ids.length !== 1 ? "s" : ""}
                    </div>
                  </>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Generate Material View (Formerly GenerateTab) ---------- */
function GenerateMaterialView({
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
        <Card className="border-amber-500/50 bg-amber-50">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-amber-800">
              No documents uploaded yet. The AI will generate generic questions
              without your course materials. Upload documents in the Documents
              tab first for highly tailored materials.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-2">
            Generate Material
          </CardTitle>
          <CardDescription>
            Describe the kind of material you want to practice. The AI will use
            your uploaded documents to build it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div>
            <Textarea
              placeholder="e.g. Generate a multiple choice quiz about binary search trees and their time complexity"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none bg-slate-50 border-slate-200 focus-visible:ring-primary/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                  handleGenerate();
              }}
            />
            <p className="text-xs text-slate-400 mt-2 font-mono">
              Press Ctrl+Enter to generate
            </p>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 block">
              Filter by Topics (optional)
            </label>
            {selectedTopics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedTopics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                  >
                    {t}
                    <span className="text-primary/60 ml-0.5">&times;</span>
                  </button>
                ))}
              </div>
            )}
            {courseTopics.length > 0 ? (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTopicsOpen(!topicsOpen)}
                  className="text-xs h-8 text-slate-600"
                >
                  {topicsOpen
                    ? "Close topics menu"
                    : `Browse ${courseTopics.length} existing topics...`}
                </Button>
                {topicsOpen && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    {courseTopics
                      .filter((t) => !selectedTopics.includes(t))
                      .map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTopic(t)}
                          className="rounded-md border border-dashed border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm"
                        >
                          + {t}
                        </button>
                      ))}
                    {courseTopics.filter((t) => !selectedTopics.includes(t))
                      .length === 0 && (
                      <span className="text-xs text-slate-400">
                        All available topics selected
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No topics exist yet. The AI will tag new topics automatically.
              </p>
            )}
          </div>

          <div className="flex gap-4 items-end pt-2">
            <div className="w-24">
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Question Count
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={numQuestions}
                className="bg-slate-50"
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
              className="flex-1 font-bold shadow-md h-10"
            >
              {generating ? "Building Material..." : "Generate Material"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generation Results */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-black text-slate-900 border-b pb-2">
            Material Ready
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedQuestions.map((q) => (
              <Link
                key={q.id}
                to={`/questions/${q.id}`}
                className="block no-underline"
              >
                <Card className="transition-all hover:shadow-md hover:border-primary/40 cursor-pointer h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-none"
                      >
                        New Component
                      </Badge>
                    </div>
                    <CardTitle className="text-base text-slate-900 leading-tight">
                      {q.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-2">
                      {q.topic && (
                        <span className="font-mono text-[10px] uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mr-2">
                          {q.topic}
                        </span>
                      )}
                      <span className="text-primary font-medium hover:underline">
                        Click to open &rarr;
                      </span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No context warning */}
      {hasGenerated &&
        contextUsed.length === 0 &&
        generatedQuestions.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-50">
            <CardContent className="py-3 px-4">
              <p className="text-sm text-amber-800">
                <strong>Notice:</strong> No specific document context was used
                for this batch. Ensure your documents are finished processing in
                the Documents tab.
              </p>
            </CardContent>
          </Card>
        )}

      {/* Context preview */}
      {contextUsed.length > 0 && (
        <div className="space-y-3 mt-8">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Source Material Used
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contextUsed.map((chunk, i) => (
              <Card
                key={i}
                className="bg-slate-50 border-slate-100 shadow-inner"
              >
                <CardContent className="py-3 px-4">
                  <p className="text-[11px] font-mono text-slate-500 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                    {chunk}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
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
    <div className="space-y-4 max-w-3xl">
      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-slate-300 hover:border-primary/50 hover:bg-slate-50"
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
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
          <Plus className="size-6" />
        </div>
        <p className="font-bold text-slate-700">
          {uploading ? "Uploading files..." : "Click or drag documents here"}
        </p>
        <p className="text-xs text-slate-500 mt-2 font-mono">
          PDF, TXT, MD, DOCX (Max 10MB)
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-slate-500 text-sm italic mt-8 text-center">
          No course materials uploaded yet.
        </p>
      ) : (
        <div className="space-y-3 mt-8">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2">
            Active Files
          </h3>
          {documents.map((doc) => (
            <Card key={doc.id} className="shadow-sm border-slate-200">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm font-bold text-slate-800 truncate">
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
                      className="text-[10px] uppercase tracking-wider shrink-0"
                    >
                      {doc.status === "done" ? "Indexed" : doc.status}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 h-8"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Remove
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
      <p className="text-slate-500 text-center py-12 text-sm font-medium animate-pulse">
        Analyzing your performance history...
      </p>
    );
  }

  const isEmpty =
    strengths.length === 0 &&
    weaknesses.length === 0 &&
    recentActivity.length === 0;

  if (isEmpty) {
    return (
      <Card className="border-dashed shadow-none bg-slate-50/50">
        <CardContent className="py-12 text-center">
          <p className="text-slate-500 text-sm">
            No insights available yet. Complete a few generated materials and
            return here to see your AI-tracked progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="text-base text-green-800">
                Identified Strengths
              </CardTitle>
              <CardDescription className="text-green-600/80">
                Concepts you have consistently mastered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strengths.length > 0 ? (
                <ul className="space-y-3">
                  {strengths.map((s, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm font-medium text-slate-800"
                    >
                      <span className="text-green-600 font-bold shrink-0">
                        &rarr;
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  Keep practicing to build your strengths.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-base text-amber-800">
                Focus Areas
              </CardTitle>
              <CardDescription className="text-amber-600/80">
                Topics causing you friction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weaknesses.length > 0 ? (
                <ul className="space-y-3">
                  {weaknesses.map((w, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm font-medium text-slate-800"
                    >
                      <span className="text-amber-600 font-bold shrink-0">
                        &rarr;
                      </span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  No blind spots identified yet!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Logs</CardTitle>
            <CardDescription>
              Your most recent material interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentActivity.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="text-slate-300 shrink-0 font-bold">
                    &bull;
                  </span>
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
