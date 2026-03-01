import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth";
import Layout from "@/components/Layout";
import AssessmentPage from "@/pages/AssessmentPage";
import AuthPage from "@/pages/AuthPage";
import CoursePage from "@/pages/CoursePage";
import DashboardPage from "@/pages/DashboardPage";
import LandingPage from "@/pages/LandingPage";
import MemoryGraphEmbed from "@/pages/MemoryGraphEmbed";
import QuestionPage from "@/pages/QuestionPage";
import "katex/dist/katex.min.css";

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Render embed routes without Layout (used in iframes)
  if (location.pathname === "/embed/memory-graph") {
    if (!user && !loading) return <AuthPage />;
    return <MemoryGraphEmbed />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/courses/:id" element={<CoursePage />} />
        <Route path="/assessments/:id" element={<AssessmentPage />} />
        <Route path="/questions/:id" element={<QuestionPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
