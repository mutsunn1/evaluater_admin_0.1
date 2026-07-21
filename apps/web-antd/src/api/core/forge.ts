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
