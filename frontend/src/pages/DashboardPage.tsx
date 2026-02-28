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
                    placeholder="/home/user/courses/my-course"
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
                <Card className="cursor-pointer hover:bg-slate-900/50 transition-colors">
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
  );
}
