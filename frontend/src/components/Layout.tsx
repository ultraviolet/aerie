import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isQuestionPage = location.pathname.startsWith("/questions/");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="flex items-center gap-6 border-b border-slate-800 bg-slate-900 px-6 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight text-white no-underline hover:text-white/90">
          prAIrie
        </Link>
        <Link to="/" className="text-sm text-slate-400 no-underline hover:text-white">
          Dashboard
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {user && (
            <>
              <span className="text-sm text-slate-400">{user.username}</span>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={logout}>
                Log out
              </Button>
            </>
          )}
        </div>
      </nav>
      {isQuestionPage ? (
        <main className="flex-1 overflow-hidden">{children}</main>
      ) : (
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      )}
    </div>
  );
}
