import { describe, expect, it, vi } from 'vitest';

describe('admin user timing stats api', () => {
  it('calls /admin/v1/users/{id}/timing-stats with days', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      by_question_type: [
        { accuracy_rate: 50, avg_response_time_ms: 1250, count: 2, question_type: 'multiple_choice' },
      ],
      by_skill_dimension: [
        { accuracy_rate: 50, avg_response_time_ms: 1250, count: 2, skill_dimension: 'vocabulary' },
      ],
      days: 30,
      user_id: 'u1',
    });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: mockGet },
    }));
    const { getUserTimingStatsApi } = await import('./admin-user-timing-stats');
    const result = await getUserTimingStatsApi('u1', 14);
    expect(mockGet).toHaveBeenCalledWith('/admin/v1/users/u1/timing-stats', {
      params: { days: 14 },
    });
    expect(result.by_question_type[0]?.question_type).toBe('multiple_choice');
  });
});
