import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isQuestionPage = location.pathname.startsWith("/questions/");
  const isDashboardPage = location.pathname === "/";

  // flex-col + overflow-hidden on the dashboard main is what enables internal scrolling
  let mainClasses = "flex flex-col flex-1 min-h-0 w-full ";

  if (isDashboardPage) {
    mainClasses += "mx-auto max-w-5xl px-6 overflow-hidden flex flex-col";
  } else if (isQuestionPage) {
    mainClasses += "overflow-hidden";
  } else {
    mainClasses += "mx-auto max-w-5xl px-6 py-8 overflow-y-auto";
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <nav className="flex shrink-0 items-center justify-between bg-transparent px-6 py-4">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-slate-900 no-underline"
        >
          prAIrie
        </Link>
        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="font-medium text-slate-900 hover:bg-transparent hover:text-slate-600"
          >
            Log out
          </Button>
        )}
      </nav>
      <main className={mainClasses}>{children}</main>
    </div>
  );
}
