import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import type { Assessment, Course } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Record<number, Assessment[]>>({});
  const [loadPath, setLoadPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCourses = async () => {
    const data = await api.listCourses();
    setCourses(data);
    const aMap: Record<number, Assessment[]> = {};
    for (const c of data) {
      aMap[c.id] = await api.listAssessments(c.id);
    }
    setAssessments(aMap);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleLoad = async () => {
    if (!loadPath.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api.loadCourse(loadPath.trim());
      await fetchCourses();
      setLoadPath("");
      setDialogOpen(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your courses and study topics.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Load Course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Load a course</DialogTitle>
              <DialogDescription>
                Enter the path to a PrairieLearn-format course directory.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="/path/to/your/course"
              value={loadPath}
              onChange={(e) => setLoadPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLoad} disabled={loading}>
                {loading ? "Loading..." : "Load"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Courses Grid */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
        {courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No courses loaded yet.</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                Load your first course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const courseAssessments = assessments[course.id] ?? [];
              return (
                <Link key={course.id} to={`/courses/${course.id}`} className="no-underline">
                  <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardDescription className="font-mono text-xs">{course.name}</CardDescription>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {courseAssessments.length} assessment{courseAssessments.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}

            {/* Add course card */}
            <Card
              className="flex h-full cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-accent"
              onClick={() => setDialogOpen(true)}
            >
              <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <span className="text-3xl">+</span>
                <span className="text-sm font-medium">Load New Course</span>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
