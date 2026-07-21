import type {
  ForgeCostMetrics,
  ForgeCritiqueAvg,
  ForgeMetricsGates,
  ForgeMetricsSummary,
} from '#/api';

/**
 * Pure transformations from the forge metrics payloads into chart-ready
 * rows. Kept separate from the page so they can be unit-tested without
 * mounting echarts.
 */

/** Display order and labels of the five QA gates. */
export const GATE_LABELS: ReadonlyArray<{
  key: keyof ForgeMetricsGates;
  label: string;
}> = [
  { key: 'deterministic', label: '确定性校验' },
  { key: 'fence', label: '围栏' },
  { key: 'critique', label: '评审' },
  { key: 'dedup', label: '去重' },
  { key: 'tts', label: '语音' },
];

/** Labels of the four critique score dimensions. */
export const CRITIQUE_LABELS: ReadonlyArray<{
  key: keyof ForgeCritiqueAvg;
  label: string;
}> = [
  { key: 'naturalness', label: '自然度' },
  { key: 'answer_uniqueness', label: '答案唯一性' },
  { key: 'distractor_quality', label: '干扰项质量' },
  { key: 'difficulty_fit', label: '难度匹配' },
];

export interface GateRow {
  key: string;
  label: string;
  passed: number;
  failed: number;
  /** Pass rate in [0, 1], straight from the server. */
  passRate: number;
}

/** QA gates in fixed display order. */
export function toGateRows(summary: ForgeMetricsSummary): GateRow[] {
  return GATE_LABELS.map(({ key, label }) => {
    const gate = summary.gates[key];
    return {
      key,
      label,
      passed: gate.passed,
      failed: gate.failed,
      passRate: gate.pass_rate,
    };
  });
}

export interface CritiqueDimension {
  key: string;
  label: string;
  value: number;
}

/** Critique dimension averages in fixed display order. */
export function toCritiqueDimensions(
  summary: ForgeMetricsSummary,
): CritiqueDimension[] {
  return CRITIQUE_LABELS.map(({ key, label }) => ({
    key,
    label,
    value: summary.critique_avg[key],
  }));
}

export interface FailureRow {
  reason: string;
  count: number;
}

/** Failure reasons sorted by count desc, capped at `limit`. */
export function toFailureRows(
  summary: ForgeMetricsSummary,
  limit: number = 10,
): FailureRow[] {
  return [...summary.failure_reasons]
    .toSorted((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ reason, count }) => ({ reason, count }));
}

export interface CostSeries {
  dates: string[];
  tokens: number[];
  costs: number[];
}

/** By-day cost metrics as parallel series for a dual-axis line chart. */
export function toCostSeries(cost: ForgeCostMetrics): CostSeries {
  return {
    dates: cost.by_day.map((day) => day.date),
    tokens: cost.by_day.map((day) => day.tokens),
    costs: cost.by_day.map((day) => day.cost),
  };
}

/** Grand total of produced items across all categories. */
export function totalProducedItems(summary: ForgeMetricsSummary): number {
  return summary.by_category.reduce((sum, category) => sum + category.items, 0);
}
