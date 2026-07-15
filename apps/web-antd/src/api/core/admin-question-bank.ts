import { adminRequestClient } from '#/api/request';

export interface QuestionBankSampleItem {
  id: string;
  question_text: string;
  question_type: string;
  response_mode: string;
  options: string[];
  correct_answer: string;
  target_level: string;
  skill_dimension: string;
  scene?: string;
  grammar_focus?: string;
  source: string;
  created_at: string;
}

export interface SampleListResult {
  items: QuestionBankSampleItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface UploadTask {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total: number;
  processed: number;
  failed_count: number;
  errors: Array<{ line: number; reason: string }>;
  created_at?: string;
  updated_at?: string;
}

export async function uploadSamplesApi(file: File): Promise<{ task_id: string; status: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return adminRequestClient.post<{ task_id: string; status: string }>(
    '/admin/v1/question-bank/samples/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}

export async function getUploadTaskApi(taskId: string): Promise<UploadTask> {
  return adminRequestClient.get<UploadTask>(
    `/admin/v1/question-bank/samples/upload/tasks/${encodeURIComponent(taskId)}`,
  );
}

export async function getQuestionBankSamplesApi(params: {
  page: number;
  page_size: number;
  question_type?: string;
  target_level?: string;
  skill_dimension?: string;
}): Promise<SampleListResult> {
  return adminRequestClient.get<SampleListResult>('/admin/v1/question-bank/samples', { params });
}

export async function searchQuestionBankSamplesApi(params: {
  q: string;
  question_type?: string;
  target_level?: string;
  skill_dimension?: string;
  top_k?: number;
}): Promise<{ items: QuestionBankSampleItem[] }> {
  return adminRequestClient.get<{ items: QuestionBankSampleItem[] }>(
    '/admin/v1/question-bank/samples/search',
    { params },
  );
}

export async function deleteQuestionBankSampleApi(id: string): Promise<{ deleted: boolean }> {
  return adminRequestClient.delete<{ deleted: boolean }>(
    `/admin/v1/question-bank/samples/${encodeURIComponent(id)}`,
  );
}
