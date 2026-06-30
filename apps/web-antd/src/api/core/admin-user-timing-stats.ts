import { adminRequestClient } from '#/api/request';

export interface TimingStatsBucket {
  count: number;
  total_response_time_ms: number;
  correct_count: number;
  avg_response_time_ms: number | null;
  accuracy_rate: number | null;
}

export interface QuestionTypeTimingStats extends TimingStatsBucket {
  question_type: string;
}

export interface SkillDimensionTimingStats extends TimingStatsBucket {
  skill_dimension: string;
}

export interface UserTimingStats {
  user_id: string;
  days: number;
  by_question_type: QuestionTypeTimingStats[];
  by_skill_dimension: SkillDimensionTimingStats[];
}

export async function getUserTimingStatsApi(
  user_id: string,
  days: number = 30,
): Promise<UserTimingStats> {
  return adminRequestClient.get<UserTimingStats>(
    `/admin/v1/users/${encodeURIComponent(user_id)}/timing-stats`,
    { params: { days } },
  );
}
