"use client";

import * as React from "react";
import {
  Plus,
  LayoutGrid,
  GraduationCap,
  Save,
  FileText,
  BrainCircuit,
  BookOpen,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Your Original Layout Code (Restored) ---
function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isQuestionPage = location.pathname.startsWith("/questions/");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="flex items-center gap-6 border-b border-slate-800 bg-slate-900 px-6 py-3">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-white no-underline hover:text-white/90"
        >
          prAIrie
        </Link>
        <Link
          to="/"
          className="text-sm text-slate-400 no-underline hover:text-white"
        >
          Dashboard
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {user && (
            <>
              <span className="text-sm text-slate-400">{user.username}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
                onClick={logout}
              >
                Log out
              </Button>
            </>
          )}
        </div>
      </nav>
      {isQuestionPage ? (
        <main className="flex-1 overflow-hidden">{children}</main>
      ) : (
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
      )}
    </div>
  );
}

// --- Dashboard Component ---
export default function DashboardPage() {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [courses, setCourses] = React.useState<any[]>([]);
  const [coursePath, setCoursePath] = React.useState("");

  // 1. Fetch existing courses on load
  React.useEffect(() => {
    const fetchCourses = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      } catch (err) {
        console.error("Failed to load courses", err);
      }
    };
    fetchCourses();
  }, []);

  // 2. The "Actually Working" Create Logic
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      // Ensure the URL matches your FastAPI router prefix
      const response = await fetch("/api/courses/load", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path: coursePath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to load course");
      }

      const newCourse = await response.json();
      setCourses((prev) => [...prev, newCourse]);
      setCoursePath("");
      setShowCreateForm(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Courses
            </h1>
            <p className="text-slate-400">
              Manage your AI-enhanced course materials.
            </p>
          </div>

          {/* Your Button is Back */}
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant={showCreateForm ? "outline" : "default"}
          >
            {showCreateForm ? (
              <>
                <LayoutGrid className="mr-2 size-4" /> View Library
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" /> New Course
              </>
            )}
          </Button>
        </div>

        {showCreateForm ? (
          <div className="max-w-2xl mx-auto transition-all duration-500">
            <Card>
              <CardHeader>
                <CardTitle>Load Course Path</CardTitle>
                <CardDescription className="text-slate-400">
                  Enter the absolute path to your PrairieLearn directory.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleCreate}>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="path" className="text-slate-200">
                      Directory Path
                    </Label>
                    <Input
                      id="path"
                      placeholder="C:/Users/name/Documents/my-course"
                      value={coursePath}
                      onChange={(e) => setCoursePath(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-4">
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                      <FileText className="size-5 mb-2 text-slate-400" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                        Docs
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                      <BrainCircuit className="size-5 mb-2 text-slate-400" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                        AI Quiz
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                      <BookOpen className="size-5 mb-2 text-slate-400" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                        Assess
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isLoading}>
                    <Save className="mr-2 size-4" />
                    Load Course
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.length > 0 ? (
              courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="no-underline"
                >
                  <Card className="cursor-pointer">
                    <CardHeader>
                      <CardTitle>{course.title || course.name}</CardTitle>
                      <CardDescription className="text-[10px] font-mono">
                        {course.container_tag}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                <div className="p-4 rounded-full bg-slate-900 border border-slate-800 mb-4">
                  <GraduationCap className="size-10 text-slate-700" />
                </div>
                <h3 className="text-xl font-semibold text-slate-200">
                  Your library is empty
                </h3>
                <p className="text-slate-500 mb-8 max-w-xs text-center">
                  Add your first course to start saving documents and generating
                  AI assessments.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  Add First Course
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
