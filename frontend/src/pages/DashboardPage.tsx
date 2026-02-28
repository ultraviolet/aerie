"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  LayoutGrid,
  GraduationCap,
  Save,
  FileText,
  BrainCircuit,
  BookOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
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
import { api } from "@/api";
import type { Course } from "@/types";

export default function DashboardPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursePath, setCoursePath] = useState("");

  useEffect(() => {
    api.listCourses().then(setCourses).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newCourse = await api.loadCourse(coursePath);
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
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Courses
          </h1>
          <p className="text-slate-400 text-sm">
            Manage your AI-enhanced course materials.
          </p>
        </div>

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
        <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
          <Card>
            <CardHeader>
              <CardTitle>Load Course Path</CardTitle>
              <CardDescription>
                Enter the absolute path to your PrairieLearn directory.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="path"
                    className="text-slate-400 uppercase text-[10px] tracking-widest font-bold"
                  >
                    Directory Path
                  </Label>
                  <Input
                    id="path"
                    placeholder="/home/user/courses/my-course"
                    value={coursePath}
                    onChange={(e) => setCoursePath(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4">
                  <FeatureIndicator icon={<FileText />} label="Docs" />
                  <FeatureIndicator icon={<BrainCircuit />} label="AI Quiz" />
                  <FeatureIndicator icon={<BookOpen />} label="Assess" />
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
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="min-w-[140px]"
                >
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
                className="no-underline block"
              >
                {/* Passing only cursor-pointer. 
                   Hover and Click effects are now managed by the default Card component.
                */}
                <Card className="cursor-pointer h-full">
                  <CardHeader>
                    <div className="p-2 w-fit rounded-lg bg-slate-900 border border-slate-800 mb-2">
                      <GraduationCap className="size-5 text-slate-400" />
                    </div>
                    <CardTitle>{course.title || course.name}</CardTitle>
                    <CardDescription className="text-[10px] font-mono tracking-tighter uppercase">
                      Container: {course.container_tag}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))
          ) : (
            <EmptyStateView onAction={() => setShowCreateForm(true)} />
          )}
        </div>
      )}
    </div>
  );
}

/* --- UI Sub-components --- */

function FeatureIndicator({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/50 border border-slate-800">
      <div className="size-5 mb-2 text-slate-500">{icon}</div>
      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
        {label}
      </span>
    </div>
  );
}

function EmptyStateView({ onAction }: { onAction: () => void }) {
  return (
    <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
      <div className="p-4 rounded-full bg-slate-900 border border-slate-800 mb-4 shadow-inner">
        <GraduationCap className="size-10 text-slate-700" />
      </div>
      <h3 className="text-xl font-semibold text-white">
        Your library is empty
      </h3>
      <p className="text-slate-500 mb-8 max-w-xs text-center text-sm leading-relaxed">
        Add your first PrairieLearn course to begin generating AI-enhanced
        materials.
      </p>
      <Button onClick={onAction}>Add First Course</Button>
    </div>
  );
}
