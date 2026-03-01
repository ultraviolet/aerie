"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Save, ArrowLeft } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/api";

export default function CreateCourseForm({
  onClose,
}: {
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [title, setTitle] = React.useState("");

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      // Sends only the title; backend handles name mapping and tag generation
      await api.createCourse(title.trim());
      handleClose(); // Close the modal instead of hard-navigating
    } catch (error) {
      console.error("Failed to create course:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Added onClick={handleClose} to the backdrop so clicking outside the modal closes it
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      {/* Added onClick stopPropagation so clicking inside the card doesn't trigger the backdrop close */}
      <Card
        className="w-full max-w-2xl shadow-2xl border-slate-200 bg-white animate-in slide-in-from-bottom-4 zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-slate-900">
              new course
            </CardTitle>
            <div className="p-2 bg-slate-900 rounded-lg">
              <Plus className="size-5 text-white" />
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleCreate}>
          <CardContent>
            <div className="grid gap-2">
              <Label
                htmlFor="title"
                className="text-sm font-bold text-slate-700"
              >
                course title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CS 233 - Computer Architecture"
                className="h-12 border-slate-300 text-lg focus-visible:ring-slate-400"
                required
                autoFocus
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between gap-3 p-6 pb-0">
            <Button
              variant="ghost"
              type="button"
              onClick={handleClose}
              className="text-slate-900 hover:text-slate-900 hover:bg-transparent"
            >
              <ArrowLeft className="mr-2 size-4" /> cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="bg-slate-900 text-white hover:bg-slate-800 px-8 transition-all"
            >
              <Save className="mr-2 size-4" />
              {isLoading ? "creating..." : "create course"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
