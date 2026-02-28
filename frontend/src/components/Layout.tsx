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
    // Full screen, no padding, no scroll
    mainClasses += "overflow-hidden";
  } else {
    // Standard pages: centered, padded, and scrollable
    mainClasses += "mx-auto w-full max-w-5xl px-6 py-8 overflow-y-auto";
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Removed border-b, changed py-3 to py-4 for a bit more breathing room */}
      <nav className="flex shrink-0 items-center justify-between bg-transparent px-6 py-4">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-slate-900 transition-colors hover:text-slate-600 no-underline"
        >
          prAIrie
        </Link>

        {user && (
          <Button
            variant="ghost"
            size="sm"
            className="text-sm font-medium text-slate-900 bg-transparent px-0 hover:bg-transparent hover:text-slate-600 transition-colors"
            onClick={logout}
          >
            Log out
          </Button>
        )}
      </nav>

      <main className={mainClasses}>{children}</main>
    </div>
  );
}
