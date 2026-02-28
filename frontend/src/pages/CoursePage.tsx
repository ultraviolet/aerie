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
  Check,
  X,
  Save,
  ArrowLeft,
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

  if (error) return <p className="text-destructive p-6">{error}</p>;
  if (!course)
    return (
      <p className="text-center text-muted-foreground py-12">
        Loading course...
      </p>
    );

  return (
    // Fixed height flex container for the whole page
    <div className="h-[100dvh] flex flex-col max-w-5xl mx-auto w-full pt-0 px-4 overflow-hidden">
      {/* Top utility row: Back button & Simple Edit/Delete links */}
      <div className="shrink-0 flex items-center justify-between pt-4 pb-2">
        <Link to="/">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-slate-500 hover:text-slate-900"
          >
            &larr; back to dashboard
          </Button>
        </Link>

        {!isEditingName && !isConfirmingDelete && (
          <div className="flex items-center gap-4 text-sm font-medium pr-1">
            <button
              onClick={() => {
                setEditName(course.title);
                setIsEditingName(true);
              }}
              className="text-slate-500 hover:text-slate-900 hover:cursor-pointer flex items-center transition-colors"
            >
              <Pencil className="size-3.5 mr-1.5" />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="text-slate-500 hover:text-red-600 hover:cursor-pointer flex items-center transition-colors"
            >
              <Trash2 className="size-3.5 mr-1.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs Container now wraps the header so the Nav list can sit next to the Title */}
      <Tabs
        defaultValue="materials"
        className="flex flex-col flex-1 overflow-hidden"
      >
        <div className="shrink-0 mb-4 border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
          <div className="flex-1 min-w-0 w-full">
            {/* INLINE DELETE CONFIRMATION */}
            {isConfirmingDelete ? (
              <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 text-red-800 font-bold">
                  <AlertCircle className="size-4" /> delete "{course.title}"?
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteCourse}
                    disabled={isProcessing}
                    className="text-white"
                  >
                    {isProcessing ? "deleting..." : "yes, permanently delete"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isProcessing}
                    className="text-red-700 hover:text-red-800 hover:bg-red-100"
                  >
                    cancel
                  </Button>
                </div>
              </div>
            ) : // INLINE EDITING STATE
            isEditingName ? (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="max-w-sm text-sm font-semibold h-10 bg-white shadow-inner"
                  autoFocus
                  disabled={isProcessing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setIsEditingName(false);
                      setEditName(course.title);
                    }
                  }}
                />
                <div className="flex items-center gap-1">
                  <Button
                    onClick={handleSaveName}
                    disabled={isProcessing}
                    size="icon"
                    className="h-10 w-10 font-bold shadow-md hover:scale-[1.03] active:scale-95 transition-all"
                    title="Save"
                  >
                    <Save className="size-5" />
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditingName(false);
                      setEditName(course.title);
                    }}
                    disabled={isProcessing}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    title="Cancel"
                  >
                    <X className="size-5" />
                  </Button>
                </div>
              </div>
            ) : (
              // DEFAULT HEADER STATE
              <h1 className="text-4xl font-black tracking-tight text-slate-900 truncate pr-4 uppercase">
                {course.title}
              </h1>
            )}
          </div>
          {/* Tabs Navigation (Flex-aligned with the header block) */}
          <TabsList className="shrink-0 flex flex-row h-auto w-full sm:w-[450px] gap-2 p-1 bg-slate-200/60 border border-slate-300/50 shadow-inner rounded-xl">
            <TabsTrigger
              value="materials"
              className="flex-1 flex items-center justify-center text-center py-3.5 px-2 text-base font-semibold rounded-lg data-[state=active]:shadow-md data-[state=active]:bg-white hover:scale-[1.03] hover:shadow-md active:scale-95 active:shadow-sm transition-all duration-200"
            >
              materials
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="flex-1 flex items-center justify-center text-center py-3.5 px-2 text-base font-semibold rounded-lg data-[state=active]:shadow-md data-[state=active]:bg-white hover:scale-[1.03] hover:shadow-md active:scale-95 active:shadow-sm transition-all duration-200"
            >
              documents
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="flex-1 flex items-center justify-center text-center py-3.5 px-2 text-base font-semibold rounded-lg data-[state=active]:shadow-md data-[state=active]:bg-white hover:scale-[1.03] hover:shadow-md active:scale-95 active:shadow-sm transition-all duration-200"
            >
              insights
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents (Scrollable inner areas) */}
        <TabsContent
          value="materials"
          className="flex-col flex-1 overflow-hidden data-[state=active]:flex mt-0 focus-visible:outline-none"
        >
          <MaterialsTab
            courseId={courseId}
            materials={assessments}
            onRefresh={() => api.listAssessments(courseId).then(setAssessments)}
          />
        </TabsContent>

        <TabsContent
          value="documents"
          className="flex-col flex-1 overflow-hidden data-[state=active]:flex mt-0 focus-visible:outline-none"
        >
          <DocumentsTab courseId={courseId} />
        </TabsContent>

        <TabsContent
          value="info"
          className="flex-col flex-1 overflow-hidden data-[state=active]:flex mt-0 focus-visible:outline-none"
        >
          <InfoTab courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ... MaterialsTab, DocumentsTab, and InfoTab components remain exactly identical below this point.

/* ---------- Materials Tab ---------- */
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

  if (isGenerating) {
    return (
      <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
        <div className="flex-1 overflow-y-auto pb-12 pr-2">
          <GenerateMaterialView
            courseId={courseId}
            onGenerated={onRefresh}
            onCancel={() => setIsGenerating(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
      {/* Toolbar: Toggle View & Add Button (FIXED) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className={`h-8 px-3 ${viewMode === "grid" ? "shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="size-4 mr-2" /> grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className={`h-8 px-3 ${viewMode === "list" ? "shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            onClick={() => setViewMode("list")}
          >
            <List className="size-4 mr-2" /> list
          </Button>
        </div>

        <Button
          onClick={() => setIsGenerating(true)}
          className="font-bold shadow-md"
        >
          <Plus className="size-4 mr-2" /> add new material
        </Button>
      </div>

      {/* Grid / List Content (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto pb-12 pr-2">
        {materials.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-muted-foreground text-sm font-medium mb-4">
              no materials found for this course.
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
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-300 text-slate-500 uppercase font-mono tracking-tighter bg-slate-50 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-colors"
                        >
                          {m.type}
                        </Badge>
                        {/* Score Badge (Grid View) */}
                        <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shadow-sm group-hover:border-primary/30 transition-colors">
                          {m.score_pct != null
                            ? `${Math.round(m.score_pct)}%`
                            : "NEW"}
                        </span>
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
                    <>
                      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-300 text-slate-500 uppercase font-mono tracking-tighter bg-slate-50 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-colors shrink-0"
                        >
                          {m.type}
                        </Badge>
                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm sm:text-base truncate">
                          {m.number ? `${m.number}. ` : ""}
                          {m.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest shrink-0 hidden sm:block">
                          {m.question_ids.length} question
                          {m.question_ids.length !== 1 ? "s" : ""}
                        </div>
                        {/* Score Badge (List View) */}
                        <span className="text-[12px] font-black font-mono px-2 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shadow-sm group-hover:border-primary/30 transition-colors">
                          {m.score_pct != null
                            ? `${Math.round(m.score_pct)}%`
                            : "NEW"}
                        </span>
                      </div>
                    </>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
/* ---------- Generate Material View ---------- */
function GenerateMaterialView({
  courseId,
  onGenerated,
  onCancel,
}: {
  courseId: number;
  onGenerated: () => void;
  onCancel: () => void;
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
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="">
          <CardTitle className="text-xl flex items-center gap-2 font-bold">
            generate material
          </CardTitle>
          <CardDescription>
            describe the kind of material you want to practice, and aerie will
            use your uploaded documents to build it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div>
            <Textarea
              placeholder="e.g. generate a multiple choice quiz about binary search trees and their time complexity"
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
              press Ctrl+Enter to generate
            </p>
          </div>

          {/* Unified Compact Topics View */}
          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 block">
              filter by topics (optional)
            </label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1 custom-scrollbar">
              {/* Show selected first */}
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

              {/* Show remaining available topics */}
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

              {courseTopics.length === 0 && (
                <p className="text-xs text-slate-400 w-full">
                  no topics exist yet, but aerie will tag new topics
                  automatically.
                </p>
              )}
            </div>
          </div>

          {/* Inline Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={generating}
              className="flex items-center justify-center gap-2 text-slate-900 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors"
            >
              <ArrowLeft className="size-4" />
              cancel
            </Button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-700 whitespace-nowrap">
                  question count:
                </label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={numQuestions}
                  className="w-20 bg-slate-50 h-10 font-mono"
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
                className="flex-1 sm:flex-none font-bold shadow-md h-10 px-8 transition-all hover:scale-[1.02] active:scale-95"
              >
                {generating ? "generating..." : "generate"}
              </Button>
            </div>
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
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest pb-2 border-b">
            Material Ready
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedQuestions.map((q) => (
              <Link
                key={q.id}
                to={`/questions/${q.id}`}
                className="block no-underline"
              >
                <Card className="transition-all hover:shadow-md hover:border-primary/40 cursor-pointer h-full pb-3">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base text-slate-900 leading-tight">
                      {q.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-2">
                      {q.topic && (
                        <span className="font-mono text-[10px] uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mr-2">
                          {q.topic}
                        </span>
                      )}
                      <span className="text-primary font-medium">
                        click to open &rarr;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for the deletion confirmation modal
  const [docToDelete, setDocToDelete] = useState<CourseDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const confirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteDocument(docToDelete.id);
      setDocToDelete(null);
      fetchDocs(); // Refresh the list
    } catch (e) {
      setError(String(e));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden w-full relative">
      {/* Deletion Confirmation Overlay */}
      {docToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white border border-red-200 shadow-lg rounded-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-800 font-bold text-lg">
              <AlertCircle className="size-5" /> delete document?
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              are you sure you want to remove{" "}
              <strong className="text-slate-900">{docToDelete.filename}</strong>
              ? this will permanently wipe it from the AI's memory context.
            </p>
            <div className="flex items-center gap-3 mt-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="text-slate-600 hover:text-slate-900"
              >
                cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "deleting..." : "yes, remove"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.txt,.md,.docx"
        onChange={(e) => {
          handleUpload(e.target.files);
          // Reset input so the exact same file can be uploaded again if needed
          if (e.target) e.target.value = "";
        }}
      />

      {error && (
        <p className="shrink-0 text-sm text-destructive mb-4">{error}</p>
      )}

      {/* Document list (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto pb-12 pr-2">
        <div className="flex items-center justify-between pb-2 mb-3 mt-1">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest m-0">
            Active Files
          </h3>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="h-8 shadow-sm font-bold"
          >
            <Plus className="size-4 mr-1.5" />
            {uploading ? "uploading..." : "upload file(s)"}
          </Button>
        </div>

        {documents.length === 0 ? (
          <p className="text-slate-500 text-sm italic mt-8 text-center">
            no course materials uploaded yet.
          </p>
        ) : (
          <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-3 transition-colors hover:bg-slate-50 ${
                  index !== documents.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {doc.filename}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 shrink-0 transition-colors"
                  onClick={() => setDocToDelete(doc)}
                  title="Remove document"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
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

  // The InfoTab itself is strictly scrollable
  return (
    <div className="flex-1 overflow-y-auto pb-12 pr-2 space-y-6">
      {isEmpty ? (
        <Card className="border-dashed shadow-none bg-slate-50/50">
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 text-sm">
              No insights available yet. Complete a few generated materials and
              return here to see your AI-tracked progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
