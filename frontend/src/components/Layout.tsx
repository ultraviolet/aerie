import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isQuestionPage = location.pathname.startsWith("/questions/");
  const isDashboardPage = location.pathname === "/";

  // Base class to ensure Flexbox handles the height properly
  let mainClasses = "flex-1 min-h-0 ";

  if (isDashboardPage) {
    // Restores your side padding and max-width, but keeps the scroll lock
    mainClasses += "mx-auto w-full max-w-5xl px-6 py-8 overflow-hidden";
  } else if (isQuestionPage) {
    // Full screen, no padding, no scroll (your original setup)
    mainClasses += "overflow-hidden";
  } else {
    // Standard pages: centered, padded, and scrollable
    mainClasses += "mx-auto w-full max-w-5xl px-6 py-8 overflow-y-auto";
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <nav className="flex shrink-0 items-center gap-6 border-b border-slate-800 bg-slate-900 px-6 py-3">
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

      <main className={mainClasses}>{children}</main>
    </div>
  );
}
