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
      <main
        className={
          isQuestionPage
            ? "flex-1 overflow-hidden"
            : "mx-auto w-full max-w-5xl flex-1 px-6 py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [courses, setCourses] = React.useState<any[]>([]);
  const [coursePath, setCoursePath] = React.useState("");

  // 1. Fetch Library on Load
  React.useEffect(() => {
    const fetchCourses = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/api/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setCourses(await res.json());
      } catch (err) {
        console.error("Library fetch failed", err);
      }
    };
    fetchCourses();
  }, []);

  // 2. Handle Creation (Loader Hook)
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch("/api/courses/load", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path: coursePath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Invalid Course Directory");
      }

      const newCourse = await response.json();
      setCourses((prev) => [...prev, newCourse]);
      setShowCreateForm(false);
      setCoursePath("");
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
          <h1 className="text-3xl font-bold text-white">Course Library</h1>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? (
              <>
                <LayoutGrid className="mr-2 size-4" />
                Library
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                Add Course
              </>
            )}
          </Button>
        </div>

        {showCreateForm ? (
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Sync PrairieLearn Course</CardTitle>
              <CardDescription>
                Enter the absolute path to a course directory containing
                infoCourse.json
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <CardContent>
                <Label htmlFor="path">Absolute Directory Path</Label>
                <Input
                  id="path"
                  placeholder="C:/Users/name/Documents/cs101"
                  value={coursePath}
                  onChange={(e) => setCoursePath(e.target.value)}
                  required
                />
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.length > 0 ? (
              courses.map((c) => (
                <Link key={c.id} to={`/courses/${c.id}`}>
                  <Card className="cursor-pointer hover:bg-slate-900/50 transition-colors">
                    <CardHeader>
                      <CardTitle className="truncate">
                        {c.title || c.name}
                      </CardTitle>
                      <CardDescription className="text-[10px] font-mono">
                        {c.container_tag}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-20 text-slate-500">
                No courses loaded yet.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
