import { describe, expect, it, vi } from 'vitest';

describe('admin auth api', () => {
  it('calls /admin/v1/login with password', async () => {
    const mockPost = vi.fn().mockResolvedValue({ access_token: 'tk' });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { post: mockPost },
    }));
    const { adminLoginApi: api } = await import('./admin-auth');
    const result = await api('admin123');
    expect(mockPost).toHaveBeenCalledWith('/admin/v1/login', { password: 'admin123' });
    expect(result.access_token).toBe('tk');
  });
});
