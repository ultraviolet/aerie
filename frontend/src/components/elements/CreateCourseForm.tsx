"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Save, ArrowLeft } from "lucide-react";
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
import { api } from "@/api";

export default function CreateCourseForm() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [title, setTitle] = React.useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      // Sends only the title; backend handles name mapping and tag generation
      await api.createCourse(title.trim());
      navigate("/");
    } catch (error) {
      console.error("Failed to create course:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="shadow-2xl border-slate-200 bg-white">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">
              <Plus className="size-5 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              New Course
            </CardTitle>
          </div>
          <CardDescription className="text-slate-500">
            Enter a title for your course workspace.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleCreate}>
          <CardContent>
            <div className="grid gap-2">
              <Label
                htmlFor="title"
                className="text-sm font-bold text-slate-700"
              >
                Course Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Automata Theory"
                className="h-12 border-slate-300 text-lg focus-visible:ring-slate-400"
                required
                autoFocus
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between gap-3 bg-slate-50/50 border-t border-slate-100 p-6">
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate("/")}
              className="text-slate-500 hover:text-slate-900 hover:bg-transparent"
            >
              <ArrowLeft className="mr-2 size-4" /> Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="bg-slate-900 text-white hover:bg-slate-800 px-8 transition-all"
            >
              <Save className="mr-2 size-4" />
              {isLoading ? "Creating..." : "Create Course"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
