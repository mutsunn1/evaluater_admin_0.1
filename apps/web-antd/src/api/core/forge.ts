import { forgeHealthClient, forgeRequestClient } from '#/api/request';

export interface ForgeLlmProvider {
  name: string;
  ok: boolean;
}

export interface ForgeHealth {
  status: string;
  version: string;
  llm_providers: ForgeLlmProvider[];
}

export interface ForgePlanCategory {
  slug: string;
  level: string;
  skill: string;
  question_type: string;
  quota: number;
  status: string;
  produced: number;
}

export interface ForgeRunCategory {
  slug: string;
  done: number;
  failed: number;
  total: number;
}

export interface ForgeRunSummary {
  run_id: string;
  status: string;
  started_at: null | string;
  finished_at: null | string;
  total_done: number;
  total_failed: number;
  total_tokens: number;
  total_cost: number;
}

export interface ForgeRunDetail {
  run_id: string;
  status: string;
  categories: ForgeRunCategory[];
  total_tokens: number;
  total_cost: number;
  started_at: null | string;
  finished_at: null | string;
}

export interface CreateForgeRunParams {
  plan?: string;
  categories?: string[];
  concurrency?: number;
}

export type ForgeReviewItemStatus =
  | 'edited'
  | 'passed'
  | 'pending'
  | 'rejected';

export interface ForgeReviewItemMedia {
  audio?: string;
  transcript?: string;
}

export interface ForgeReviewItem {
  content_hash: string;
  id: string;
  level: string;
  skill: string;
  question_type: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
  media: ForgeReviewItemMedia | null;
  source_file: string;
  status: ForgeReviewItemStatus;
}

export interface ForgeReviewSessionSummary {
  session_id: string;
  created_at: string;
  total: number;
  reviewed: number;
  status: string;
}

export interface ForgeReviewSessionDetail {
  session_id: string;
  items: ForgeReviewItem[];
  progress: { reviewed: number; total: number };
}

export interface CreateForgeReviewSessionParams {
  /** "all" or an explicit list of source file names; omit for the default. */
  sources?: 'all' | string[];
  /** Sampling rate, defaults to 0.05 on the server. */
  rate?: number;
  seed?: number;
}

export interface EditForgeReviewItemParams {
  session_id: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface ForgeMetricsGate {
  passed: number;
  failed: number;
  /** Ratio in [0, 1] as produced by the server. */
  pass_rate: number;
}

export interface ForgeMetricsGates {
  deterministic: ForgeMetricsGate;
  fence: ForgeMetricsGate;
  critique: ForgeMetricsGate;
  dedup: ForgeMetricsGate;
  tts: ForgeMetricsGate;
}

export interface ForgeCritiqueAvg {
  naturalness: number;
  answer_uniqueness: number;
  distractor_quality: number;
  difficulty_fit: number;
}

export interface ForgeMetricsSummary {
  gates: ForgeMetricsGates;
  critique_avg: ForgeCritiqueAvg;
  failure_reasons: Array<{ count: number; reason: string }>;
  by_category: Array<{ failed: number; items: number; slug: string }>;
}

export interface ForgeRecentItem {
  id: string;
  level: string;
  skill: string;
  question_type: string;
  stem: string;
  source_file: string;
}

export interface ForgeRecentItemsResult {
  items: ForgeRecentItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ForgeCostMetrics {
  by_run: Array<{ cost: number; run_id: string; tokens: number }>;
  by_day: Array<{ cost: number; date: string; tokens: number }>;
  total_tokens: number;
  total_cost: number;
}

export interface ForgeBatchCategory {
  slug: string;
  count: number;
}

export interface ForgeBatchImportInfo {
  at: string;
  task_id: string;
  processed: number;
  failed_count: number;
}

export interface ForgeBatch {
  batch_id: string;
  file: string;
  items: number;
  categories: ForgeBatchCategory[];
  imported: ForgeBatchImportInfo | null;
  blacklisted_count: number;
}

export interface ForgeBatchRollbackResult {
  batch_id: string;
  deleted: number;
  missing: number;
}

export interface ForgeDatasourceRecords {
  chars?: null | number;
  grammar?: null | number;
  vocab?: null | number;
}

export interface ForgeDatasource {
  name: string;
  license: string;
  records: ForgeDatasourceRecords;
  cleaned_at: null | string;
  source_repo: string;
  status: string;
}

export interface ForgeDatasourcesResult {
  datasources: ForgeDatasource[];
  blacklist_count: number;
}

export interface ForgeDatasourceRefreshResult {
  name: string;
  /** Total registered records before and after the cleaning script runs. */
  before: number;
  after: number;
  diff: { added: number; removed: number };
  ok: boolean;
  error?: string;
}

export interface ForgeVocabItem {
  word: string;
  pinyin: string;
  pos: string;
  level_hsk20: number | string;
  level_hsk30: number | string;
  en: string;
  source: string;
}

export interface ForgeVocabListResult {
  items: ForgeVocabItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ForgeBlacklistResult {
  /** Content hashes currently on the blacklist. */
  items: string[];
  total: number;
}

/**
 * Probe the forge service health endpoint. Unauthenticated; the dedicated
 * health client applies a 3s timeout so offline detection is fast.
 */
export async function getForgeHealthApi(): Promise<ForgeHealth> {
  const resp = await forgeHealthClient.get('/health');
  return resp.data as ForgeHealth;
}

/** Fetch the production plan categories. Requires the admin Bearer token. */
export async function getForgePlanApi(): Promise<{
  categories: ForgePlanCategory[];
}> {
  return forgeRequestClient.get('/api/v1/plan');
}

/** Start a production run (full plan or a subset of category slugs). */
export async function createForgeRunApi(
  params: CreateForgeRunParams,
): Promise<{ run_id: string }> {
  return forgeRequestClient.post('/api/v1/runs', params);
}

/** List historical and active runs. */
export async function getForgeRunsApi(): Promise<{ runs: ForgeRunSummary[] }> {
  return forgeRequestClient.get('/api/v1/runs');
}

/** Fetch live progress of a single run. */
export async function getForgeRunApi(runId: string): Promise<ForgeRunDetail> {
  return forgeRequestClient.get(`/api/v1/runs/${encodeURIComponent(runId)}`);
}

/** Ask a running production run to stop cooperatively. */
export async function stopForgeRunApi(
  runId: string,
): Promise<{ run_id: string; status: string }> {
  return forgeRequestClient.post(
    `/api/v1/runs/${encodeURIComponent(runId)}/stop`,
  );
}

/** Create a sampled human-review session. */
export async function createForgeReviewSessionApi(
  params: CreateForgeReviewSessionParams,
): Promise<{ session_id: string; total: number }> {
  return forgeRequestClient.post('/api/v1/review/sessions', params);
}

/** List historical review sessions with their progress. */
export async function getForgeReviewSessionsApi(): Promise<{
  sessions: ForgeReviewSessionSummary[];
}> {
  return forgeRequestClient.get('/api/v1/review/sessions');
}

/** Fetch all items of one review session. */
export async function getForgeReviewSessionApi(
  sessionId: string,
): Promise<ForgeReviewSessionDetail> {
  return forgeRequestClient.get(
    `/api/v1/review/sessions/${encodeURIComponent(sessionId)}`,
  );
}

/** Mark a review item as passed. */
export async function passForgeReviewItemApi(
  contentHash: string,
  sessionId: string,
): Promise<{ content_hash: string; status: ForgeReviewItemStatus }> {
  return forgeRequestClient.post(
    `/api/v1/review/items/${encodeURIComponent(contentHash)}/pass`,
    { session_id: sessionId },
  );
}

/** Mark a review item as rejected, optionally with a reason. */
export async function rejectForgeReviewItemApi(
  contentHash: string,
  sessionId: string,
  reason?: string,
): Promise<{ content_hash: string; status: ForgeReviewItemStatus }> {
  return forgeRequestClient.post(
    `/api/v1/review/items/${encodeURIComponent(contentHash)}/reject`,
    reason ? { reason, session_id: sessionId } : { session_id: sessionId },
  );
}

/** Edit a review item in place; the server answers 422 on validation errors. */
export async function editForgeReviewItemApi(
  contentHash: string,
  params: EditForgeReviewItemParams,
): Promise<{ content_hash: string; status: ForgeReviewItemStatus }> {
  return forgeRequestClient.post(
    `/api/v1/review/items/${encodeURIComponent(contentHash)}/edit`,
    params,
  );
}

/**
 * Download an audio attachment as a Blob. The endpoint requires the admin
 * Bearer token, so `<audio src>` cannot point at it directly; callers should
 * wrap the blob in an object URL (and revoke it when done).
 */
export async function getForgeAudioApi(filename: string): Promise<Blob> {
  return forgeRequestClient.get(
    `/api/v1/audio/${encodeURIComponent(filename)}`,
    { responseType: 'blob' },
  );
}

/** Aggregated quality-gate metrics for the dashboard. */
export async function getForgeMetricsSummaryApi(): Promise<ForgeMetricsSummary> {
  return forgeRequestClient.get('/api/v1/metrics/summary');
}

/** Recently produced items, paginated server-side. */
export async function getForgeRecentItemsApi(params: {
  page: number;
  page_size: number;
}): Promise<ForgeRecentItemsResult> {
  return forgeRequestClient.get('/api/v1/metrics/recent-items', { params });
}

/** Token/cost usage aggregated by run and by day. */
export async function getForgeCostMetricsApi(): Promise<ForgeCostMetrics> {
  return forgeRequestClient.get('/api/v1/metrics/cost');
}

/** List produced batches with their import status. */
export async function getForgeBatchesApi(): Promise<{
  batches: ForgeBatch[];
}> {
  return forgeRequestClient.get('/api/v1/batches');
}

/**
 * Import a batch into the evaluation system's question bank. The server
 * answers 502 with a reason when the import fails.
 */
export async function importForgeBatchApi(
  batchId: string,
): Promise<{ batch_id: string; imported: ForgeBatchImportInfo }> {
  return forgeRequestClient.post(
    `/api/v1/batches/${encodeURIComponent(batchId)}/import`,
  );
}

/** Remove a previously imported batch from the question bank. */
export async function rollbackForgeBatchApi(
  batchId: string,
): Promise<ForgeBatchRollbackResult> {
  return forgeRequestClient.post(
    `/api/v1/batches/${encodeURIComponent(batchId)}/rollback`,
  );
}

/** List datasources with record counts, plus the global blacklist size. */
export async function getForgeDatasourcesApi(): Promise<ForgeDatasourcesResult> {
  return forgeRequestClient.get('/api/v1/datasources');
}

/** Re-run one datasource's cleaning script against its local raw checkout. */
export async function refreshForgeDatasourceApi(
  name: string,
): Promise<ForgeDatasourceRefreshResult> {
  const pathName = name.replaceAll('/', '~');
  return forgeRequestClient.post(
    `/api/v1/datasources/${encodeURIComponent(pathName)}/refresh`,
  );
}

/** Browse the vocabulary constraint library with optional level/keyword filters. */
export async function getForgeVocabApi(params: {
  level?: number | string;
  page: number;
  page_size: number;
  q?: string;
}): Promise<ForgeVocabListResult> {
  return forgeRequestClient.get('/api/v1/datasources/vocab', { params });
}

/** List blacklisted content hashes. */
export async function getForgeBlacklistApi(): Promise<ForgeBlacklistResult> {
  return forgeRequestClient.get('/api/v1/blacklist');
}

/** Remove one hash from the blacklist. */
export async function removeForgeBlacklistItemApi(
  hash: string,
): Promise<{ removed: boolean }> {
  return forgeRequestClient.delete(
    `/api/v1/blacklist/${encodeURIComponent(hash)}`,
  );
}
