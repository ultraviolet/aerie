import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "@/api";
import type {
  Assessment,
  Course,
  CourseDocument,
  GenerateStepEvent,
  Question,
} from "@/types";
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
  Search,
} from "lucide-react";

export default function CoursePage() {
  useEffect(() => {
    const handleGlobalScroll = (e: WheelEvent) => {
      const target = document.querySelector<HTMLElement>(
        "[data-scroll-container]",
      );
      if (!target) return;

      const overEl = (e.target as HTMLElement).closest(
        "textarea, [data-scroll-container]",
      );
      if (overEl && overEl !== target) return;

      target.scrollTop += e.deltaY;
    };

    window.addEventListener("wheel", handleGlobalScroll, { passive: true });
    return () => window.removeEventListener("wheel", handleGlobalScroll);
  }, []);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const courseId = Number(id);
  const [course, setCourse] = useState<Course | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [error, setError] = useState("");

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
    <div className="relative h-[100dvh] flex flex-col max-w-5xl mx-auto w-full pt-0 px-4 overflow-hidden">
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
              className="text-slate-500 hover:text-slate-900 flex items-center transition-colors"
            >
              <Pencil className="size-3.5 mr-1.5" />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="text-slate-500 hover:text-red-600 flex items-center transition-colors"
            >
              <Trash2 className="size-3.5 mr-1.5" />
            </button>
          </div>
        )}
      </div>

      <Tabs
        defaultValue="materials"
        className="flex flex-col flex-1 overflow-hidden"
      >
        <div className="shrink-0 mb-4 border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
          <div className="flex-1 min-w-0 w-full">
            {isEditingName ? (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="max-w-sm text-sm font-semibold h-10"
                  autoFocus
                  disabled={isProcessing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                />
                <Button
                  onClick={handleSaveName}
                  disabled={isProcessing}
                  size="icon"
                  className="h-10 w-10"
                >
                  <Save className="size-5" />
                </Button>
                <Button
                  onClick={() => setIsEditingName(false)}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                >
                  <X className="size-5" />
                </Button>
              </div>
            ) : (
              <h1 className="text-4xl font-black tracking-tight text-slate-900 truncate pr-4 uppercase">
                {course.title}
              </h1>
            )}
          </div>
          <TabsList className="shrink-0 flex flex-row h-auto w-full sm:w-[450px] gap-2 p-1 bg-slate-200/60 border border-slate-300/50 shadow-inner rounded-lg">
            <TabsTrigger
              value="materials"
              className="flex-1 py-3.5 text-base font-semibold"
            >
              materials
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="flex-1 py-3.5 text-base font-semibold"
            >
              documents
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="flex-1 py-3.5 text-base font-semibold"
            >
              insights
            </TabsTrigger>
          </TabsList>
        </div>

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

      {/* Delete confirmation modal */}
      {isConfirmingDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-red-200 shadow-2xl rounded-2xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-800 font-bold text-lg">
              <AlertCircle className="size-5" /> delete course?
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900">"{course.title}"</strong>? This
              cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end mt-2">
              <Button
                variant="ghost"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isProcessing}
              >
                cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCourse}
                disabled={isProcessing}
              >
                {isProcessing ? "deleting..." : "yes, permanently delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMaterials = materials.filter((m) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      m.title.toLowerCase().includes(query) ||
      m.type.toLowerCase().includes(query)
    );
  });

  if (isGenerating) {
    return (
      <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
        <div
          data-scroll-container
          className="flex-1 overflow-y-auto pb-12 pr-2"
        >
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
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pl-1">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 shadow-sm flex-1 focus-within:ring-1 focus-within:ring-primary/50">
          <Search className="size-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 py-2 text-sm bg-transparent outline-none border-none placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 h-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`h-8 px-3 rounded-md text-sm font-semibold transition-all duration-200 
          ${
            viewMode === "grid"
              ? "text-white shadow-sm bg-slate-900 hover:scale-[1.03] hover:bg-slate-900 hover:text-white"
              : "text-slate-900 hover:bg-slate-100 hover:scale-[1.03]"
          } active:scale-95`}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-8 px-3 rounded-md text-sm font-semibold transition-all duration-200 
          ${
            viewMode === "list"
              ? "text-white shadow-sm bg-slate-900 hover:scale-[1.03] hover:bg-slate-900 hover:text-white"
              : "text-slate-900 hover:bg-slate-100 hover:scale-[1.03]"
          } active:scale-95`}
            >
              <List className="size-4" />
            </Button>
          </div>
          <Button
            onClick={() => setIsGenerating(true)}
            className="font-bold shadow-none whitespace-nowrap h-10"
          >
            <Plus className="size-4 mr-2" /> add new material
          </Button>
        </div>
      </div>

      <div data-scroll-container className="flex-1 overflow-y-auto pb-12 pr-2">
        {filteredMaterials.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-500">
            {searchQuery
              ? "no results found for your search."
              : "no materials found for this course."}
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "flex flex-col gap-3"
            }
          >
            {filteredMaterials.map((m) => (
              <Link
                key={m.id}
                to={`/assessments/${m.id}`}
                className="no-underline block group"
              >
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:translate-x-1 hover:border-primary/30 hover:shadow-md ${viewMode === "grid" ? "h-full" : "flex flex-row items-center justify-between p-4"}`}
                >
                  {viewMode === "grid" ? (
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-[12px] font-mono text-slate-500 tracking-tighter uppercase mt-1">
                          {m.question_ids.length} question
                          {m.question_ids.length !== 1 ? "s" : ""}
                        </CardDescription>
                        <span
                          className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-md border shadow-sm ${m.score_pct == null ? "bg-slate-100 text-slate-700 border-slate-200" : m.score_pct >= 100 ? "bg-green-100 text-green-700 border-green-200" : m.score_pct > 0 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-red-100 text-red-700 border-red-200"}`}
                        >
                          {m.score_pct != null
                            ? `${Math.round(m.score_pct)}%`
                            : "NEW"}
                        </span>
                      </div>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {m.title}
                      </CardTitle>
                    </CardHeader>
                  ) : (
                    <div className="flex flex-row items-center w-full gap-6">
                      <div className="flex items-center justify-between basis-1/4 min-w-[140px] max-w-[220px] shrink-0 border-r border-slate-100 pr-6">
                        <CardDescription className="text-[11px] font-mono text-slate-500 tracking-tighter uppercase whitespace-nowrap">
                          {m.question_ids.length} question
                          {m.question_ids.length !== 1 ? "s" : ""}
                        </CardDescription>

                        <span
                          className={`text-[11px] min-w-[42px] text-center font-black font-mono px-1.5 py-0.5 rounded-md border shadow-sm shrink-0 transition-colors ${
                            m.score_pct == null
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : m.score_pct >= 100
                                ? "bg-green-100 text-green-700 border-green-200"
                                : m.score_pct > 0
                                  ? "bg-amber-100 text-amber-700 border-amber-200"
                                  : "bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          {m.score_pct != null
                            ? `${Math.round(m.score_pct)}%`
                            : "NEW"}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-md group-hover:text-primary transition-colors truncate">
                          {m.title}
                        </h3>
                      </div>
                    </div>
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

/* ---------- Documents Tab ---------- */
function DocumentsTab({ courseId }: { courseId: number }) {
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      fetchDocs();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden w-full relative">
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

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.txt,.md,.docx"
        onChange={(e) => {
          handleUpload(e.target.files);
          if (e.target) e.target.value = "";
        }}
      />

      {error && (
        <p className="shrink-0 text-sm text-destructive mb-4">{error}</p>
      )}

      <div data-scroll-container className="flex-1 overflow-y-auto pb-12 pr-2">
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
        const toStrings = (items: unknown[]): string[] =>
          (items ?? []).map((x) =>
            typeof x === "string" ? x : ((x as { text: string }).text ?? ""),
          );
        setStrengths(toStrings(data.strengths));
        setWeaknesses(toStrings(data.weaknesses));
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

  return (
    <div
      data-scroll-container
      className="flex-1 overflow-y-auto pb-12 pr-2 space-y-6"
    >
      <iframe
        src={`/embed/memory-graph?courseId=${courseId}`}
        className="w-full h-[500px] border rounded-lg"
        title="Memory Graph"
      />

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
  const [hasGenerated, setHasGenerated] = useState(false);
  const [courseTopics, setCourseTopics] = useState<string[]>([]);
  const [progressSteps, setProgressSteps] = useState<GenerateStepEvent[]>([]);

  useEffect(() => {
    api.listDocuments(courseId).then(() => {});
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
    setProgressSteps([]);
    try {
      for await (const { event, data } of api.generateQuestionsStream(
        courseId,
        {
          prompt: prompt.trim(),
          topics: selectedTopics.length > 0 ? selectedTopics : undefined,
          num_questions: numQuestions,
        },
      )) {
        if (event === "step") {
          setProgressSteps((prev) => [
            ...prev,
            data as unknown as GenerateStepEvent,
          ]);
        } else if (event === "result") {
          setGeneratedQuestions((data as { questions: Question[] }).questions);
          setContextUsed((data as { context_used: string[] }).context_used);
          setHasGenerated(true);
          onGenerated();
          api.getCourse(courseId).then((c) => setCourseTopics(c.topics ?? []));
        } else if (event === "error") {
          setError((data as { message: string }).message);
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-none border-none p-0 ">
        <CardHeader className="px-0">
          <CardTitle className="text-xl flex items-center gap-2 font-bold px-0">
            generate material
          </CardTitle>
          <CardDescription>
            describe the kind of material you want to practice, and aerie will
            use your uploaded documents to build it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-0 px-0">
          <div className="px-1">
            <Textarea
              placeholder='e.g. "test me on unit 1", "quiz me on my weak areas", or "practice binary trees from chapter 3"'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none bg-slate-50 border-slate-200 focus-visible:border-primary/60 focus-visible:ring-[2px] focus-visible:ring-primary/10 focus-visible:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                  handleGenerate();
              }}
            />
            <p className="text-xs text-slate-400 mt-2 font-mono">
              press Ctrl+Enter to generate
            </p>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 block">
              filter by topics (optional)
            </label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1 custom-scrollbar">
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

          {generating && progressSteps.length > 0 && (
            <div className="space-y-1.5 p-4 bg-slate-50 rounded-lg border border-slate-200">
              {progressSteps.map((s, i) => {
                const isLatest = i === progressSteps.length - 1;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 text-sm transition-all ${
                      isLatest ? "text-slate-900 font-medium" : "text-slate-400"
                    }`}
                  >
                    {isLatest ? (
                      <div className="size-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                    ) : (
                      <Check className="size-3.5 text-green-500 shrink-0" />
                    )}
                    <span>{s.message}</span>
                  </div>
                );
              })}
            </div>
          )}

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
                {generating
                  ? progressSteps.length > 0
                    ? progressSteps[
                        progressSteps.length - 1
                      ].message.toLowerCase()
                    : "starting..."
                  : "generate"}
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
