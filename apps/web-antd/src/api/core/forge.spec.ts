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
