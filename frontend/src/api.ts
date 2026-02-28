import type { Assessment, AssessmentDetail, AuthResponse, Course, CourseDocument, GenerateRequest, GenerateResponse, Question, Submission, Variant, Topic } from "./types";

const BASE = "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("prairie_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
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
  loadCourse: (path: string) =>
    request<Course>("/courses/load", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  getCourse: (id: number) => request<Course>(`/courses/${id}`),

  // Assessments
  listAssessments: (courseId: number) =>
    request<Assessment[]>(`/courses/${courseId}/assessments`),
  getAssessment: (id: number) => request<AssessmentDetail>(`/assessments/${id}`),

  // Questions & Variants
  getQuestion: (id: number) => request<Question>(`/questions/${id}`),
  createVariant: (questionId: number) =>
    request<Variant>(`/questions/${questionId}/variant`, { method: "POST" }),
  getVariant: (variantId: number) => request<Variant>(`/variants/${variantId}`),

  // Submissions
  submitAnswers: (variantId: number, answers: Record<string, unknown>) =>
    request<Submission>(`/variants/${variantId}/submit`, {
      method: "POST",
      body: JSON.stringify({ submitted_answers: answers }),
    }),
  // Topics
  listTopics: (courseId: number) =>
    request<Topic[]>(`/courses/${courseId}/topics`),

  createTopic: (courseId: number, name: string) =>
    request<Topic>(`/courses/${courseId}/topics`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  // Documents
  uploadDocument: async (courseId: number, file: File): Promise<CourseDocument> => {
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
};
