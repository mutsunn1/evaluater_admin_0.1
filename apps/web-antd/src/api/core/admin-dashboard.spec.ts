import { describe, expect, it, vi } from 'vitest';

describe('admin dashboard api', () => {
  it('calls /admin/v1/dashboard with days param and returns timing fields', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      avg_hsk_level: 3.5,
      avg_response_time_ms: 1200,
      avg_session_duration_ms: 45000,
      hsk_distribution: [],
      native_language_distribution: [],
      new_users_trend: [],
      skill_dimension_avg: {},
      total_users: 10,
    });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: mockGet },
    }));
    const { getDashboardApi } = await import('./admin-dashboard');
    const result = await getDashboardApi(14);
    expect(mockGet).toHaveBeenCalledWith('/admin/v1/dashboard', {
      params: { days: 14 },
    });
    expect(result.avg_session_duration_ms).toBe(45000);
    expect(result.avg_response_time_ms).toBe(1200);
  });
});
