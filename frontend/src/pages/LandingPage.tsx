import { useNavigate } from "react-router-dom";
import Hero, { LandingImages } from "@/block/minimal-hero-section-with-parallax-images";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-hidden bg-background">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <span className="text-xl font-bold tracking-tight">aerie</span>
        <button
          onClick={() => navigate("/login")}
          className="rounded-sm bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          sign in
        </button>
      </nav>

      <div className="w-full pt-10 md:pt-20 lg:pt-32">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h1 className="text-center text-2xl font-bold tracking-tight md:text-left md:text-4xl lg:text-6xl">
            AI-powered practice questions <br /> from your course material.
          </h1>

          <h2 className="font-inter max-w-xl py-8 text-center text-base text-neutral-500 md:text-left md:text-lg dark:text-neutral-400">
            Upload your notes, and aerie generates personalized practice
            questions that adapt to what you need to learn.
          </h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <button
              onClick={() => navigate("/login")}
              className="rounded-sm bg-black px-4 py-2 text-white shadow-2xl dark:bg-white dark:text-black"
            >
              Get started
            </button>
            <button
              onClick={() => navigate("/login")}
              className="rounded-sm bg-transparent px-4 py-2 text-black dark:text-white"
            >
              Sign in
            </button>
          </div>
          <LandingImages />
        </div>
      </div>
    </div>
  );
}
