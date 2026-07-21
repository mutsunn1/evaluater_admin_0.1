import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockRequestModule(
  healthGet: ReturnType<typeof vi.fn>,
  overrides?: {
    get?: ReturnType<typeof vi.fn>;
    post?: ReturnType<typeof vi.fn>;
  },
) {
  vi.doMock('#/api/request', () => ({
    forgeHealthClient: { get: healthGet },
    forgeRequestClient: {
      get: overrides?.get ?? vi.fn(),
      post: overrides?.post ?? vi.fn(),
    },
  }));
}

describe('forge api', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('probes /health via the bare health client (no auth)', async () => {
    const mockHealthGet = vi.fn().mockResolvedValue({
      data: {
        status: 'ok',
        version: '0.1.0',
        llm_providers: [{ name: 'deepseek', ok: true }],
      },
    });
    mockRequestModule(mockHealthGet);
    const { getForgeHealthApi: api } = await import('./forge');
    const result = await api();
    expect(mockHealthGet).toHaveBeenCalledWith('/health');
    expect(result.status).toBe('ok');
    expect(result.llm_providers).toHaveLength(1);
  });

  it('fetches the production plan', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      categories: [
        {
          slug: 'hsk4:reading:multiple_choice',
          level: 'HSK4',
          skill: 'reading',
          question_type: 'multiple_choice',
          quota: 100,
          status: 'pending',
          produced: 12,
        },
      ],
    });
    mockRequestModule(vi.fn(), { get: mockGet });
    const { getForgePlanApi: api } = await import('./forge');
    const result = await api();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/plan');
    expect(result.categories).toHaveLength(1);
  });

  it('creates a run with selected categories and concurrency', async () => {
    const mockPost = vi.fn().mockResolvedValue({ run_id: 'run-1' });
    mockRequestModule(vi.fn(), { post: mockPost });
    const { createForgeRunApi: api } = await import('./forge');
    const result = await api({
      categories: ['hsk4:reading:multiple_choice'],
      concurrency: 4,
    });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/runs', {
      categories: ['hsk4:reading:multiple_choice'],
      concurrency: 4,
    });
    expect(result.run_id).toBe('run-1');
  });

  it('creates a full run without categories', async () => {
    const mockPost = vi.fn().mockResolvedValue({ run_id: 'run-2' });
    mockRequestModule(vi.fn(), { post: mockPost });
    const { createForgeRunApi: api } = await import('./forge');
    await api({ concurrency: 2 });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/runs', { concurrency: 2 });
  });

  it('lists runs', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      runs: [
        {
          run_id: 'run-1',
          status: 'running',
          started_at: '2026-07-21T00:00:00Z',
          finished_at: null,
          total_done: 3,
          total_failed: 1,
          total_tokens: 1200,
          total_cost: 0.0123,
        },
      ],
    });
    mockRequestModule(vi.fn(), { get: mockGet });
    const { getForgeRunsApi: api } = await import('./forge');
    const result = await api();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/runs');
    expect(result.runs).toHaveLength(1);
  });

  it('fetches run detail with encoded id', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      run_id: 'run 1',
      status: 'running',
      categories: [{ slug: 's1', done: 1, failed: 0, total: 10 }],
      total_tokens: 100,
      total_cost: 0.001,
      started_at: '2026-07-21T00:00:00Z',
      finished_at: null,
    });
    mockRequestModule(vi.fn(), { get: mockGet });
    const { getForgeRunApi: api } = await import('./forge');
    const result = await api('run 1');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/runs/run%201');
    expect(result.categories).toHaveLength(1);
  });

  it('stops a run', async () => {
    const mockPost = vi
      .fn()
      .mockResolvedValue({ run_id: 'run-1', status: 'stopping' });
    mockRequestModule(vi.fn(), { post: mockPost });
    const { stopForgeRunApi: api } = await import('./forge');
    const result = await api('run-1');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/runs/run-1/stop');
    expect(result.status).toBe('stopping');
  });
});

describe('forge review api', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('creates a review session with rate and seed', async () => {
    const mockPost = vi
      .fn()
      .mockResolvedValue({ session_id: 'rs-1', total: 42 });
    mockRequestModule(vi.fn(), { post: mockPost });
    const { createForgeReviewSessionApi: api } = await import('./forge');
    const result = await api({ rate: 0.05, seed: 7 });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/review/sessions', {
      rate: 0.05,
      seed: 7,
    });
    expect(result.session_id).toBe('rs-1');
    expect(result.total).toBe(42);
  });

  it('creates a review session with explicit sources', async () => {
    const mockPost = vi
      .fn()
      .mockResolvedValue({ session_id: 'rs-2', total: 5 });
    mockRequestModule(vi.fn(), { post: mockPost });
    const { createForgeReviewSessionApi: api } = await import('./forge');
    await api({ sources: ['a.jsonl', 'b.jsonl'], rate: 0.1 });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/review/sessions', {
      sources: ['a.jsonl', 'b.jsonl'],
      rate: 0.1,
    });
  });

  it('lists review sessions', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      sessions: [
        {
          session_id: 'rs-1',
          created_at: '2026-07-21T00:00:00Z',
          total: 42,
          reviewed: 10,
          status: 'open',
        },
      ],
    });
    mockRequestModule(vi.fn(), { get: mockGet });
    const { getForgeReviewSessionsApi: api } = await import('./forge');
    const result = await api();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/review/sessions');
    expect(result.sessions).toHaveLength(1);
  });

  it('fetches review session detail with encoded id', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      session_id: 'rs 1',
      items: [
        {
          content_hash: 'h1',
          id: 'q1',
          level: 'HSK4',
          skill: 'reading',
          question_type: 'multiple_choice',
          stem: '题干',
          options: ['甲', '乙'],
          answer: 'A',
          explanation: '解析',
          media: { audio: 'a.mp3', transcript: '文本' },
          source_file: 'out.jsonl',
          status: 'pending',
        },
      ],
      progress: { total: 1, reviewed: 0 },
    });
    mockRequestModule(vi.fn(), { get: mockGet });
    const { getForgeReviewSessionApi: api } = await import('./forge');
    const result = await api('rs 1');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/review/sessions/rs%201');
    expect(result.items).toHaveLength(1);
    expect(result.progress.total).toBe(1);
  });

  it('passes a review item', async () => {
    const mockPost = vi
      .fn()
      .mockResolvedValue({ content_hash: 'h1', status: 'passed' });
    mockRequestModule(vi.fn(), { post: mockPost });
    const { passForgeReviewItemApi: api } = await import('./forge');
    const result = await api('h1', 'rs-1');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/review/items/h1/pass', {
      session_id: 'rs-1',
    });
    expect(result.status).toBe('passed');
  });

  it('rejects a review item with a reason', async () => {
    const mockPost = vi
      .fn()
      .mockResolvedValue({ content_hash: 'h1', status: 'rejected' });
    mockRequestModule(vi.fn(), { post: mockPost });
    const { rejectForgeReviewItemApi: api } = await import('./forge');
    await api('h1', 'rs-1', '答案错误');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/review/items/h1/reject', {
      reason: '答案错误',
      session_id: 'rs-1',
    });
  });

  it('rejects a review item without a reason', async () => {
    const mockPost = vi
      .fn()
      .mockResolvedValue({ content_hash: 'h1', status: 'rejected' });
    mockRequestModule(vi.fn(), { post: mockPost });
    const { rejectForgeReviewItemApi: api } = await import('./forge');
    await api('h1', 'rs-1');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/review/items/h1/reject', {
      session_id: 'rs-1',
    });
  });

  it('edits a review item with the four editable fields', async () => {
    const mockPost = vi
      .fn()
      .mockResolvedValue({ content_hash: 'h1', status: 'edited' });
    mockRequestModule(vi.fn(), { post: mockPost });
    const { editForgeReviewItemApi: api } = await import('./forge');
    const params = {
      session_id: 'rs-1',
      stem: '新题干',
      options: ['甲', '乙', '丙'],
      answer: 'B',
      explanation: '新解析',
    };
    const result = await api('h1', params);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/review/items/h1/edit',
      params,
    );
    expect(result.status).toBe('edited');
  });

  it('downloads audio as a blob', async () => {
    const mockGet = vi.fn().mockResolvedValue(new Blob(['audio']));
    mockRequestModule(vi.fn(), { get: mockGet });
    const { getForgeAudioApi: api } = await import('./forge');
    const result = await api('a b.mp3');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/audio/a%20b.mp3', {
      responseType: 'blob',
    });
    expect(result).toBeInstanceOf(Blob);
  });
});
