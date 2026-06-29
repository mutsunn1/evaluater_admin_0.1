import { describe, expect, it, vi } from 'vitest';

describe('admin sessions api', () => {
  it('calls /admin/v1/sessions/active', async () => {
    const mockGet = vi.fn().mockResolvedValue({ items: [], total: 0 });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: mockGet },
    }));
    const { getActiveSessionsApi: api } = await import('./admin-sessions');
    const result = await api();
    expect(mockGet).toHaveBeenCalledWith('/admin/v1/sessions/active');
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});
