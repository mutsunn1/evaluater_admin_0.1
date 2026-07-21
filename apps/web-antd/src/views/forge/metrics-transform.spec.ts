import type { ForgeCostMetrics, ForgeMetricsSummary } from '#/api';

import { describe, expect, it } from 'vitest';

import {
  toCostSeries,
  toCritiqueDimensions,
  toFailureRows,
  toGateRows,
  totalProducedItems,
} from './metrics-transform';

const summary: ForgeMetricsSummary = {
  gates: {
    deterministic: { passed: 90, failed: 10, pass_rate: 0.9 },
    fence: { passed: 95, failed: 5, pass_rate: 0.95 },
    critique: { passed: 80, failed: 20, pass_rate: 0.8 },
    dedup: { passed: 99, failed: 1, pass_rate: 0.99 },
    tts: { passed: 100, failed: 0, pass_rate: 1 },
  },
  critique_avg: {
    naturalness: 4.1,
    answer_uniqueness: 4.5,
    distractor_quality: 3.9,
    difficulty_fit: 4.2,
  },
  failure_reasons: [
    { reason: '答案不唯一', count: 12 },
    { reason: '难度不符', count: 30 },
    { reason: '题干不自然', count: 7 },
  ],
  by_category: [
    { slug: 'hsk4:reading:mc', items: 100, failed: 10 },
    { slug: 'hsk5:listening:mc', items: 40, failed: 4 },
  ],
};

describe('metrics transforms', () => {
  it('maps gates in fixed display order with labels', () => {
    const rows = toGateRows(summary);
    expect(rows.map((row) => row.key)).toEqual([
      'deterministic',
      'fence',
      'critique',
      'dedup',
      'tts',
    ]);
    expect(rows.map((row) => row.label)).toEqual([
      '确定性校验',
      '围栏',
      '评审',
      '去重',
      '语音',
    ]);
    expect(rows[0]).toMatchObject({ passed: 90, failed: 10, passRate: 0.9 });
  });

  it('maps critique dimensions in fixed order', () => {
    const dimensions = toCritiqueDimensions(summary);
    expect(dimensions.map((dimension) => dimension.key)).toEqual([
      'naturalness',
      'answer_uniqueness',
      'distractor_quality',
      'difficulty_fit',
    ]);
    expect(dimensions.map((dimension) => dimension.value)).toEqual([
      4.1, 4.5, 3.9, 4.2,
    ]);
    expect(dimensions[0]?.label).toBe('自然度');
  });

  it('sorts failure reasons by count desc and caps the list', () => {
    const rows = toFailureRows(summary);
    expect(rows.map((row) => row.count)).toEqual([30, 12, 7]);
    expect(rows[0]?.reason).toBe('难度不符');

    const capped = toFailureRows(summary, 2);
    expect(capped).toHaveLength(2);
    expect(capped.map((row) => row.reason)).toEqual(['难度不符', '答案不唯一']);
  });

  it('does not mutate the source failure list while sorting', () => {
    const before = summary.failure_reasons.map((row) => row.reason);
    toFailureRows(summary);
    expect(summary.failure_reasons.map((row) => row.reason)).toEqual(before);
  });

  it('splits by-day cost into parallel series', () => {
    const cost: ForgeCostMetrics = {
      by_run: [],
      by_day: [
        { date: '2026-07-19', tokens: 1000, cost: 0.01 },
        { date: '2026-07-20', tokens: 2000, cost: 0.02 },
      ],
      total_tokens: 3000,
      total_cost: 0.03,
    };
    expect(toCostSeries(cost)).toEqual({
      dates: ['2026-07-19', '2026-07-20'],
      tokens: [1000, 2000],
      costs: [0.01, 0.02],
    });
  });

  it('handles empty by-day cost data', () => {
    const cost: ForgeCostMetrics = {
      by_run: [],
      by_day: [],
      total_tokens: 0,
      total_cost: 0,
    };
    expect(toCostSeries(cost)).toEqual({ dates: [], tokens: [], costs: [] });
  });

  it('sums produced items across categories', () => {
    expect(totalProducedItems(summary)).toBe(140);
    expect(totalProducedItems({ ...summary, by_category: [] })).toBe(0);
  });
});
