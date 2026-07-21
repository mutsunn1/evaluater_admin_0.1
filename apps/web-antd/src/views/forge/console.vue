<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import type { ForgePlanCategory, ForgeRunDetail, ForgeRunSummary } from '#/api';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  InputNumber,
  message,
  Progress,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createForgeRunApi,
  getForgePlanApi,
  getForgeRunApi,
  getForgeRunsApi,
  stopForgeRunApi,
} from '#/api';
import { useForgeStore } from '#/store';

/** Run statuses that still produce progress updates. */
const ACTIVE_RUN_STATUSES = new Set(['pending', 'running', 'stopping']);
/** Polling interval for the active run (contract allows 2-5s). */
const RUN_POLL_INTERVAL = 3000;

const forgeStore = useForgeStore();

const planLoading = ref(false);
const categories = ref<ForgePlanCategory[]>([]);
const selectedSlugs = ref<Key[]>([]);
const concurrency = ref(4);

const starting = ref(false);
const stopping = ref(false);
const currentRun = ref<ForgeRunDetail | null>(null);
const historyRuns = ref<ForgeRunSummary[]>([]);
const historyLoading = ref(false);
const pollTimer = ref<null | ReturnType<typeof setInterval>>(null);

const runActive = computed(
  () => !!currentRun.value && ACTIVE_RUN_STATUSES.has(currentRun.value.status),
);

const runProgress = computed(() => {
  const run = currentRun.value;
  if (!run) return 0;
  const total = run.categories.reduce((sum, c) => sum + c.total, 0);
  if (total === 0) return 0;
  const processed = run.categories.reduce(
    (sum, c) => sum + c.done + c.failed,
    0,
  );
  return Math.round((processed / total) * 100);
});

const runTotals = computed(() => {
  const run = currentRun.value;
  if (!run) return { done: 0, failed: 0 };
  return {
    done: run.categories.reduce((sum, c) => sum + c.done, 0),
    failed: run.categories.reduce((sum, c) => sum + c.failed, 0),
  };
});

const planColumns = [
  { dataIndex: 'level', title: '等级', width: 90 },
  { dataIndex: 'skill', title: '技能', width: 110 },
  { dataIndex: 'question_type', title: '题型', width: 170 },
  { dataIndex: 'slug', ellipsis: true, title: '类目' },
  { dataIndex: 'quota', title: '配额', width: 90 },
  { dataIndex: 'status', title: '状态', width: 100 },
  { dataIndex: 'produced', title: '已产出', width: 90 },
];

const runCategoryColumns = [
  { dataIndex: 'slug', ellipsis: true, title: '类目' },
  { dataIndex: 'done', title: '完成', width: 80 },
  { dataIndex: 'failed', title: '失败', width: 80 },
  { dataIndex: 'total', title: '总数', width: 80 },
];

const historyColumns = [
  { dataIndex: 'run_id', ellipsis: true, title: 'Run ID' },
  { dataIndex: 'status', title: '状态', width: 100 },
  { dataIndex: 'total_done', title: '完成', width: 80 },
  { dataIndex: 'total_failed', title: '失败', width: 80 },
  { dataIndex: 'total_tokens', title: 'Token', width: 110 },
  { dataIndex: 'total_cost', title: '成本', width: 100 },
  { dataIndex: 'started_at', title: '开始时间', width: 170 },
  { dataIndex: 'finished_at', title: '结束时间', width: 170 },
];

function statusColor(status: string) {
  switch (status) {
    case 'completed':
    case 'done': {
      return 'green';
    }
    case 'failed': {
      return 'red';
    }
    case 'running': {
      return 'blue';
    }
    case 'stopping': {
      return 'orange';
    }
    default: {
      return 'default';
    }
  }
}

function statusText(status: string) {
  switch (status) {
    case 'completed':
    case 'done': {
      return '已完成';
    }
    case 'failed': {
      return '失败';
    }
    case 'pending': {
      return '等待中';
    }
    case 'running': {
      return '运行中';
    }
    case 'stopped': {
      return '已停止';
    }
    case 'stopping': {
      return '停止中';
    }
    default: {
      return status;
    }
  }
}

function formatTime(value: null | string | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatCost(value: number) {
  return `$${(value ?? 0).toFixed(4)}`;
}

function formatTokens(value: number) {
  return (value ?? 0).toLocaleString();
}

async function fetchPlan() {
  planLoading.value = true;
  try {
    const res = await getForgePlanApi();
    categories.value = res.categories;
  } finally {
    planLoading.value = false;
  }
}

async function fetchHistory() {
  historyLoading.value = true;
  try {
    const res = await getForgeRunsApi();
    historyRuns.value = res.runs;
  } finally {
    historyLoading.value = false;
  }
}

function onSelectChange(keys: Key[]) {
  selectedSlugs.value = keys;
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

function startPolling(runId: string) {
  stopPolling();
  pollTimer.value = setInterval(async () => {
    try {
      const data = await getForgeRunApi(runId);
      currentRun.value = data;
      if (!ACTIVE_RUN_STATUSES.has(data.status)) {
        stopPolling();
        // Produced counts and history only settle once the run ends.
        fetchPlan();
        fetchHistory();
      }
    } catch {
      // Ignore polling errors; the error interceptor already surfaces them.
    }
  }, RUN_POLL_INTERVAL);
}

async function handleStart() {
  starting.value = true;
  try {
    const body =
      selectedSlugs.value.length > 0
        ? {
            categories: selectedSlugs.value.map(String),
            concurrency: concurrency.value,
          }
        : { concurrency: concurrency.value };
    const { run_id } = await createForgeRunApi(body);
    message.success(`生产任务已启动：${run_id}`);
    selectedSlugs.value = [];
    await fetchHistory();
    const detail = await getForgeRunApi(run_id);
    currentRun.value = detail;
    startPolling(run_id);
  } catch {
    message.error('启动失败');
  } finally {
    starting.value = false;
  }
}

async function handleStop() {
  if (!currentRun.value) return;
  stopping.value = true;
  try {
    const { status } = await stopForgeRunApi(currentRun.value.run_id);
    currentRun.value = { ...currentRun.value, status };
    message.success('已请求停止，等待任务收尾');
  } catch {
    message.error('停止失败');
  } finally {
    stopping.value = false;
  }
}

async function retryHealth() {
  const online = await forgeStore.checkHealth();
  if (online) {
    message.success('forge 服务已恢复');
    fetchPlan();
    fetchHistory();
  }
}

onMounted(async () => {
  if (!forgeStore.forgeOnline) {
    // The page is reachable via direct URL even when the menu is hidden.
    await forgeStore.checkHealth();
  }
  if (!forgeStore.forgeOnline) return;
  await Promise.all([fetchPlan(), fetchHistory()]);
  // Resume tracking if a run is still active (e.g. after a page refresh).
  const active = historyRuns.value.find((run) =>
    ACTIVE_RUN_STATUSES.has(run.status),
  );
  if (active) {
    try {
      currentRun.value = await getForgeRunApi(active.run_id);
      startPolling(active.run_id);
    } catch {
      // Ignore; history table still shows the run.
    }
  }
});

onBeforeUnmount(stopPolling);
</script>

<template>
  <div class="p-5">
    <Alert
      v-if="!forgeStore.forgeOnline"
      class="mb-4"
      type="warning"
      show-icon
      message="forge 服务离线"
      description="无法连接题目生成服务（默认 http://localhost:8100）。服务恢复后菜单与操作将自动启用。"
    >
      <template #action>
        <Button size="small" @click="retryHealth">重试</Button>
      </template>
    </Alert>

    <Card class="mb-4" title="类目生产计划">
      <template #extra>
        <Space>
          <span class="text-gray-500">并发</span>
          <InputNumber
            v-model:value="concurrency"
            :min="1"
            :max="16"
            :disabled="runActive || !forgeStore.forgeOnline"
          />
          <Button
            type="primary"
            :loading="starting"
            :disabled="runActive || !forgeStore.forgeOnline"
            @click="handleStart"
          >
            {{
              selectedSlugs.length > 0
                ? `启动选中（${selectedSlugs.length}）`
                : '全量启动'
            }}
          </Button>
          <Button
            danger
            :loading="stopping"
            :disabled="!runActive"
            @click="handleStop"
          >
            停止
          </Button>
        </Space>
      </template>

      <Table
        :columns="planColumns"
        :data-source="categories"
        :loading="planLoading"
        :pagination="false"
        :row-selection="{
          selectedRowKeys: selectedSlugs,
          onChange: onSelectChange,
        }"
        row-key="slug"
        size="small"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.dataIndex === 'status'">
            <Tag :color="statusColor((row as ForgePlanCategory).status)">
              {{ statusText((row as ForgePlanCategory).status) }}
            </Tag>
          </template>
        </template>
      </Table>
    </Card>

    <Card v-if="currentRun" class="mb-4" title="当前任务">
      <Descriptions :column="4" size="small" bordered>
        <Descriptions.Item label="Run ID" :span="2">
          {{ currentRun.run_id }}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag :color="statusColor(currentRun.status)">
            {{ statusText(currentRun.status) }}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="开始时间">
          {{ formatTime(currentRun.started_at) }}
        </Descriptions.Item>
        <Descriptions.Item label="完成">
          {{ runTotals.done }}
        </Descriptions.Item>
        <Descriptions.Item label="失败">
          {{ runTotals.failed }}
        </Descriptions.Item>
        <Descriptions.Item label="Token">
          {{ formatTokens(currentRun.total_tokens) }}
        </Descriptions.Item>
        <Descriptions.Item label="成本">
          {{ formatCost(currentRun.total_cost) }}
        </Descriptions.Item>
      </Descriptions>

      <Progress
        class="mt-4"
        :percent="runProgress"
        :status="runActive ? 'active' : undefined"
      />

      <Table
        class="mt-4"
        :columns="runCategoryColumns"
        :data-source="currentRun.categories"
        :pagination="false"
        row-key="slug"
        size="small"
      />
    </Card>

    <Card title="历史任务">
      <template #extra>
        <Button :disabled="!forgeStore.forgeOnline" @click="fetchHistory">
          刷新
        </Button>
      </template>
      <Table
        :columns="historyColumns"
        :data-source="historyRuns"
        :loading="historyLoading"
        :pagination="{ pageSize: 10, showTotal: (t: number) => `共 ${t} 条` }"
        row-key="run_id"
        size="small"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.dataIndex === 'status'">
            <Tag :color="statusColor((row as ForgeRunSummary).status)">
              {{ statusText((row as ForgeRunSummary).status) }}
            </Tag>
          </template>
          <template v-else-if="column.dataIndex === 'total_tokens'">
            {{ formatTokens((row as ForgeRunSummary).total_tokens) }}
          </template>
          <template v-else-if="column.dataIndex === 'total_cost'">
            {{ formatCost((row as ForgeRunSummary).total_cost) }}
          </template>
          <template v-else-if="column.dataIndex === 'started_at'">
            {{ formatTime((row as ForgeRunSummary).started_at) }}
          </template>
          <template v-else-if="column.dataIndex === 'finished_at'">
            {{ formatTime((row as ForgeRunSummary).finished_at) }}
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
