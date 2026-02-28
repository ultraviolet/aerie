export interface User {
  id: number;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Course {
  id: number;
  name: string;
  title: string;
  path: string;
  container_tag: string;
  topics: string[];
}

export interface Assessment {
  id: number;
  course_id: number;
  tid: string;
  title: string;
  type: string;
  number: string;
  set_name: string;
  question_ids: string[];
  score_pct: number | null;
}

export interface RecentAssessment {
  assessment_id: number;
  course_id: number;
  course_title: string;
  title: string;
  score_pct: number | null;
  last_submitted_at: string | null;
}

export interface Question {
  id: number;
  course_id: number;
  qid: string;
  title: string;
  topic: string;
  tags: string[];
  has_server_py: boolean;
  single_variant: boolean;
}

export interface Variant {
  id: number;
  question_id: number;
  seed: number;
  params: Record<string, unknown>;
  correct_answers: Record<string, unknown>;
  rendered_html: string;
  created_at: string;
}

export interface Submission {
  id: number;
  variant_id: number;
  submitted_answers: Record<string, unknown>;
  score: number | null;
  feedback: Record<string, unknown>;
  submitted_at: string;
}

export interface AssessmentDetail {
  assessment: Assessment;
  questions: Question[];
}

export interface CourseDocument {
  id: number;
  course_id: number;
  supermemory_id: string;
  filename: string;
  content_type: string;
  status: string;
  uploaded_at: string;
}

export interface GenerateRequest {
  prompt: string;
  topics?: string[];
  num_questions?: number;
}

export interface GenerateResponse {
  questions: Question[];
  context_used: string[];
}

export interface GenerateStepEvent {
  step: string;
  message: string;
}
