import { describe, expect, it, vi } from 'vitest';

describe('admin user sessions api', () => {
  it('calls /admin/v1/users/{id}/sessions with pagination', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      items: [
        {
          duration_ms: 5000,
          ended_at: 6000,
          question_count: 2,
          session_id: 's1',
          started_at: 1000,
          total_response_time_ms: 3000,
        },
      ],
      page: 1,
      page_size: 20,
      total: 1,
    });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: mockGet },
    }));
    const { getUserSessionsApi } = await import('./admin-user-sessions');
    const result = await getUserSessionsApi('u1', { page: 2, page_size: 10 });
    expect(mockGet).toHaveBeenCalledWith('/admin/v1/users/u1/sessions', {
      params: { page: 2, page_size: 10 },
    });
    expect(result.items[0]?.session_id).toBe('s1');
  });
});
