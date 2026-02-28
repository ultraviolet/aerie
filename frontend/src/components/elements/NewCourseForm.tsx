"use client";

import * as React from "react";
import { Plus, BookOpen, FileText, BrainCircuit, Save } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateCourseForm() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Here you would call your FastAPI endpoint: /app/routers/courses.py
    // Ensure you pass the 'container_tag' for Supermemory indexing
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="size-5 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create New Course</CardTitle>
          </div>
          <CardDescription>
            Set up a dedicated space for your documents, automated assessments,
            and Supermemory integration.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleCreate}>
          <CardContent className="space-y-6">
            {/* Course Metadata */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. CS 374: Intro to Algorithms"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tag">Supermemory Container Tag</Label>
                <Input
                  id="tag"
                  placeholder="e.g. fa26-algorithms"
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  This tag links your uploaded documents to the Supermemory
                  vector store.
                </p>
              </div>
            </div>

            {/* Feature Toggles / Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border/40 bg-accent/5 flex flex-col items-center text-center gap-2">
                <FileText className="size-5 text-muted-foreground" />
                <span className="text-xs font-medium">Doc Storage</span>
              </div>
              <div className="p-4 rounded-xl border border-border/40 bg-accent/5 flex flex-col items-center text-center gap-2">
                <BrainCircuit className="size-5 text-muted-foreground" />
                <span className="text-xs font-medium">AI Questions</span>
              </div>
              <div className="p-4 rounded-xl border border-border/40 bg-accent/5 flex flex-col items-center text-center gap-2">
                <BookOpen className="size-5 text-muted-foreground" />
                <span className="text-xs font-medium">Assessments</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/40 pt-6">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              className="min-w-[140px]"
            >
              <Save className="mr-2 size-4" />
              Create Course
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
