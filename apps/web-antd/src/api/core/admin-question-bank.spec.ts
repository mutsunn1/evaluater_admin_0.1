import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin question bank api', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uploads jsonl file to /admin/v1/question-bank/samples/upload', async () => {
    const mockPost = vi.fn().mockResolvedValue({ task_id: 'task-1', status: 'pending' });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: vi.fn(), post: mockPost, delete: vi.fn() },
    }));
    const { uploadSamplesApi: api } = await import('./admin-question-bank');
    const file = new File(['{}'], 'samples.jsonl', { type: 'application/jsonlines' });
    const result = await api(file);
    expect(mockPost).toHaveBeenCalledWith(
      '/admin/v1/question-bank/samples/upload',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    expect(result.task_id).toBe('task-1');
  });

  it('fetches task status', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      task_id: 'task-1',
      status: 'completed',
      total: 1,
      processed: 1,
      failed_count: 0,
      errors: [],
    });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: mockGet, post: vi.fn(), delete: vi.fn() },
    }));
    const { getUploadTaskApi: api } = await import('./admin-question-bank');
    const result = await api('task-1');
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/v1/question-bank/samples/upload/tasks/task-1',
    );
    expect(result.status).toBe('completed');
  });

  it('lists samples with filters', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      items: [{ id: 's1', question_text: 'x' }],
      total: 1,
      page: 1,
      page_size: 20,
    });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: mockGet, post: vi.fn(), delete: vi.fn() },
    }));
    const { getQuestionBankSamplesApi: api } = await import('./admin-question-bank');
    const result = await api({ page: 1, page_size: 20, question_type: 'multiple_choice' });
    expect(mockGet).toHaveBeenCalledWith('/admin/v1/question-bank/samples', {
      params: { page: 1, page_size: 20, question_type: 'multiple_choice' },
    });
    expect(result.items).toHaveLength(1);
  });

  it('searches samples', async () => {
    const mockGet = vi.fn().mockResolvedValue({ items: [{ id: 's1' }] });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: mockGet, post: vi.fn(), delete: vi.fn() },
    }));
    const { searchQuestionBankSamplesApi: api } = await import('./admin-question-bank');
    const result = await api({ q: '水果', top_k: 10 });
    expect(mockGet).toHaveBeenCalledWith('/admin/v1/question-bank/samples/search', {
      params: { q: '水果', top_k: 10 },
    });
    expect(result.items).toHaveLength(1);
  });

  it('deletes a sample', async () => {
    const mockDelete = vi.fn().mockResolvedValue({ deleted: true });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: vi.fn(), post: vi.fn(), delete: mockDelete },
    }));
    const { deleteQuestionBankSampleApi: api } = await import('./admin-question-bank');
    const result = await api('s1');
    expect(mockDelete).toHaveBeenCalledWith('/admin/v1/question-bank/samples/s1');
    expect(result.deleted).toBe(true);
  });
});
