import type {
  Assessment,
  AssessmentDetail,
  AuthResponse,
  Course,
  CourseDocument,
  GenerateRequest,
  GenerateResponse,
  Question,
  RecentAssessment,
  Submission,
  Variant,
} from "./types";

const BASE = "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("prairie_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: getAuthHeaders(),
    ...options,
  });
  if (!res.ok) {
    if (res.status === 401) {
      // Token expired or invalid — clear it
      localStorage.removeItem("prairie_token");
      localStorage.removeItem("prairie_user");
      window.location.href = "/";
    }
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  // Auth
  register: (username: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  // Courses
  listCourses: () => request<Course[]>("/courses"),
  createCourse: (title: string) =>
    request<Course>("/courses", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  getCourse: (id: number) => request<Course>(`/courses/${id}`),

  // Assessments
  listAssessments: (courseId: number) =>
    request<Assessment[]>(`/courses/${courseId}/assessments`),
  getAssessment: (id: number) =>
    request<AssessmentDetail>(`/assessments/${id}`),
  assessmentScores: (id: number) =>
    request<{ scores: Record<string, number | null> }>(`/assessments/${id}/scores`),
  recentAssessments: () =>
    request<RecentAssessment[]>("/assessments/recent"),

  // Questions & Variants
  getQuestion: (id: number) => request<Question>(`/questions/${id}`),
  lastAttempt: (questionId: number) =>
    request<{ variant: Variant | null; submission: Submission | null }>(`/questions/${questionId}/last-attempt`),
  createVariant: (questionId: number) =>
    request<Variant>(`/questions/${questionId}/variant`, { method: "POST" }),
  getVariant: (variantId: number) => request<Variant>(`/variants/${variantId}`),
  generateSimilar: (questionId: number) =>
    request<{ question: Question; assessment_id: number | null }>(
      `/questions/${questionId}/similar`,
      { method: "POST" },
    ),

  // Submissions
  submitAnswers: (variantId: number, answers: Record<string, unknown>) =>
    request<Submission>(`/variants/${variantId}/submit`, {
      method: "POST",
      body: JSON.stringify({ submitted_answers: answers }),
    }),

  // Documents
  uploadDocument: async (
    courseId: number,
    file: File,
  ): Promise<CourseDocument> => {
    const token = localStorage.getItem("prairie_token");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/courses/${courseId}/documents`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
  },
  listDocuments: (courseId: number) =>
    request<CourseDocument[]>(`/courses/${courseId}/documents`),
  deleteDocument: (docId: number) =>
    request<{ ok: boolean }>(`/documents/${docId}`, { method: "DELETE" }),

  // Question Generation
  generateQuestions: (courseId: number, req: GenerateRequest) =>
    request<GenerateResponse>(`/courses/${courseId}/generate`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  // Insights
  getInsights: (courseId: number) =>
    request<{
      strengths: string[];
      weaknesses: string[];
      recent_activity: string[];
    }>(`/courses/${courseId}/insights`),

  // Question Chat
  chatAboutQuestion: (
    variantId: number,
    body: {
      message: string;
      history: { role: string; content: string }[];
      question_html: string;
      submitted_answers: Record<string, unknown>;
      correct_answers: Record<string, unknown>;
      score: number | null;
      feedback: Record<string, unknown>;
      course_id: number | null;
    },
  ) =>
    request<{ reply: string }>(`/variants/${variantId}/chat`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateCourse: (courseId: number, data: { title: string }) =>
    request<Course>(`/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCourse: (courseId: number) =>
    request<{ ok: boolean }>(`/courses/${courseId}`, {
      method: "DELETE",
    }),


};
