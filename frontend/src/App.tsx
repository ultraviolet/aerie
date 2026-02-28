import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth";
import Layout from "@/components/Layout";
import AssessmentPage from "@/pages/AssessmentPage";
import AuthPage from "@/pages/AuthPage";
import CoursePage from "@/pages/CoursePage";
import DashboardPage from "@/pages/DashboardPage";
import QuestionPage from "@/pages/QuestionPage";
import CreateCourseForm from "./components/elements/CreateCourseForm";
import "katex/dist/katex.min.css";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/courses/new" element={<CreateCourseForm />} />
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
