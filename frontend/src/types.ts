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
}

export interface Question {
  id: number;
  course_id: number;
  qid: string;
  title: string;
  topic_id: number
  topic?: Topic
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
  topic?: string;
  num_questions?: number;
}

export interface GenerateResponse {
  questions: Question[];
  context_used: string[];
}

export type Topic = {
  id: number
  name: string
  course_id: number
}
