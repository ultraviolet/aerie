import { useNavigate } from "react-router-dom";
import { LandingImages } from "@/block/minimal-hero-section-with-parallax-images";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <nav className="flex shrink-0 items-center justify-between px-6 py-4">
        <span className="text-3xl font-semibold tracking-tight text-slate-900">
          aerie
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/login")}
          className="text-slate-900 hover:bg-transparent hover:text-slate-600"
        >
          <LogIn className="size-4" />
        </Button>
      </nav>

      <div className="flex flex-1 min-h-0 flex-col px-6">
        <div className="shrink-0 pl-4 md:pl-8 pt-6 md:pt-12 lg:pt-20">
          <h1 className="text-center text-2xl font-bold tracking-tight md:text-left md:text-4xl lg:text-6xl">
            The AI-powered study platform <br /> that learns with you.
          </h1>

          <h2 className="font-inter max-w-xl py-6 text-center text-base text-neutral-500 md:text-left md:text-lg dark:text-neutral-400">
            Got a quiz coming up? Upload your notes, and aerie will generate
            unlimited, auto-graded practice questions.
          </h2>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Button onClick={() => navigate("/login?tab=register")}>
              get started
            </Button>
            <Button variant="ghost" onClick={() => navigate("/login")}>
              sign in
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <LandingImages />
        </div>
      </div>
    </div>
  );
}
