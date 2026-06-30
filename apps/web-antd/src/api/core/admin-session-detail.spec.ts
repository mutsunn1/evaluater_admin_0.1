import { describe, expect, it, vi } from 'vitest';

describe('admin session detail api', () => {
  it('calls /admin/v1/sessions/{id}', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      duration_ms: 5000,
      question_count: 1,
      questions: [
        {
          answered_at: 2000,
          is_correct: true,
          item_id: 1,
          pushed_at: 1000,
          question_type: 'multiple_choice',
          response_time_ms: 1000,
          round_index: 0,
          score: 100,
          skill_dimension: 'vocabulary',
        },
      ],
      round_summaries: [{ avg_response_time_ms: 1000, correct_count: 1, question_count: 1, round_index: 0 }],
      session_id: 's1',
      total_response_time_ms: 1000,
      user_id: 'u1',
    });
    vi.doMock('#/api/request', () => ({
      adminRequestClient: { get: mockGet },
    }));
    const { getSessionDetailApi } = await import('./admin-session-detail');
    const result = await getSessionDetailApi('s1');
    expect(mockGet).toHaveBeenCalledWith('/admin/v1/sessions/s1');
    expect(result.session_id).toBe('s1');
    expect(result.questions).toHaveLength(1);
  });
});
