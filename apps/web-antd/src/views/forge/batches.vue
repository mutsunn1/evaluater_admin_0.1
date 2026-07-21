<script lang="ts" setup>
import type { ForgeBatch } from '#/api';

import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { useForgeStore } from '#/store';

import { useBatches } from './use-batches';

const forgeStore = useForgeStore();
const store = useBatches();

// Top-level aliases so the template can rely on ref auto-unwrapping.
const batches = store.batches;
const loading = store.loading;
const pending = store.pending;

const importTarget = ref<ForgeBatch | null>(null);
const rollbackTarget = ref<ForgeBatch | null>(null);

const importPending = computed(() =>
  importTarget.value ? pending.value.has(importTarget.value.batch_id) : false,
);
const rollbackPending = computed(() =>
  rollbackTarget.value
    ? pending.value.has(rollbackTarget.value.batch_id)
    : false,
);

const columns = [
  { dataIndex: 'batch_id', title: '批次 ID' },
  { dataIndex: 'items', title: '题数', width: 90 },
  { dataIndex: 'blacklisted_count', title: '黑名单剔除', width: 110 },
  { dataIndex: 'imported', title: '导入状态', width: 260 },
  { key: 'action', title: '操作', width: 200 },
];

function formatTime(value: null | string | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

/**
 * The request client rethrows HTTP error bodies, so a 502 arrives here as
 * the parsed payload; FastAPI uses `detail`, the vben backend `error`/`message`.
 */
function extractReason(error: any): string {
  const detail = error?.detail ?? error?.error ?? error?.message;
  if (Array.isArray(detail)) {
    return detail.map((entry) => entry?.msg ?? String(entry)).join('；');
  }
  return typeof detail === 'string' ? detail : '';
}

function openImport(batch: ForgeBatch) {
  importTarget.value = batch;
}

async function confirmImport() {
  const batch = importTarget.value;
  if (!batch) return;
  try {
    const imported = await store.importBatch(batch.batch_id);
    if (!imported) return;
    message.success(
      `导入完成：处理 ${imported.processed} 题，失败 ${imported.failed_count} 题`,
    );
    importTarget.value = null;
    // Refetch to pick up server-side side effects (e.g. status changes).
    store.fetchBatches();
  } catch (error: any) {
    const reason = extractReason(error);
    message.error(reason ? `导入失败：${reason}` : '导入失败');
  }
}

function openRollback(batch: ForgeBatch) {
  rollbackTarget.value = batch;
}

async function confirmRollback() {
  const batch = rollbackTarget.value;
  if (!batch) return;
  try {
    const result = await store.rollbackBatch(batch.batch_id);
    if (!result) return;
    message.success(
      `回滚完成：删除 ${result.deleted} 题，缺失 ${result.missing} 题`,
    );
    rollbackTarget.value = null;
    store.fetchBatches();
  } catch (error: any) {
    const reason = extractReason(error);
    message.error(reason ? `回滚失败：${reason}` : '回滚失败');
  }
}

async function retryHealth() {
  const online = await forgeStore.checkHealth();
  if (online) {
    message.success('forge 服务已恢复');
    store.fetchBatches();
  }
}

onMounted(async () => {
  if (!forgeStore.forgeOnline) {
    // The page is reachable via direct URL even when the menu is hidden.
    await forgeStore.checkHealth();
  }
  if (forgeStore.forgeOnline) {
    store.fetchBatches();
  }
});
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

    <Card title="批次列表">
      <template #extra>
        <Button :disabled="!forgeStore.forgeOnline" @click="store.fetchBatches">
          刷新
        </Button>
      </template>

      <Table
        :columns="columns"
        :data-source="batches"
        :loading="loading"
        :pagination="false"
        row-key="batch_id"
        size="small"
      >
        <template #expandedRowRender="{ record }">
          <div class="px-2 py-1">
            <div class="mb-2">
              <span class="text-gray-500">来源文件：</span>
              {{ (record as ForgeBatch).file }}
            </div>
            <div>
              <span class="text-gray-500">类目构成：</span>
              <Tag
                v-for="category in (record as ForgeBatch).categories"
                :key="category.slug"
                class="mb-1"
              >
                {{ category.slug }} × {{ category.count }}
              </Tag>
              <span
                v-if="(record as ForgeBatch).categories.length === 0"
                class="text-gray-400"
              >
                无
              </span>
            </div>
          </div>
        </template>

        <template #bodyCell="{ column, record: row }">
          <template v-if="column.dataIndex === 'imported'">
            <template v-if="(row as ForgeBatch).imported">
              <Tag color="green">已导入</Tag>
              <div class="text-gray-500 text-xs mt-1">
                {{ formatTime((row as ForgeBatch).imported?.at) }} · 处理
                {{ (row as ForgeBatch).imported?.processed }} · 失败
                {{ (row as ForgeBatch).imported?.failed_count }}
              </div>
            </template>
            <Tag v-else>未导入</Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button
                size="small"
                type="primary"
                :disabled="
                  !!(row as ForgeBatch).imported ||
                  pending.has((row as ForgeBatch).batch_id)
                "
                :loading="pending.has((row as ForgeBatch).batch_id)"
                @click="openImport(row as ForgeBatch)"
              >
                导入 v2
              </Button>
              <Button
                size="small"
                danger
                :disabled="
                  !(row as ForgeBatch).imported ||
                  pending.has((row as ForgeBatch).batch_id)
                "
                @click="openRollback(row as ForgeBatch)"
              >
                回滚
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      :open="!!importTarget"
      title="导入批次到题库"
      :confirm-loading="importPending"
      ok-text="确认导入"
      cancel-text="取消"
      @ok="confirmImport"
      @cancel="importTarget = null"
    >
      <template v-if="importTarget">
        <p>
          将把批次 <b>{{ importTarget.batch_id }}</b> 的
          {{ importTarget.items }} 题上传到评测系统题库。
        </p>
        <p class="text-gray-500">来源文件：{{ importTarget.file }}</p>
      </template>
    </Modal>

    <Modal
      :open="!!rollbackTarget"
      title="回滚批次"
      :confirm-loading="rollbackPending"
      ok-text="确认回滚"
      cancel-text="取消"
      :ok-button-props="{ danger: true }"
      @ok="confirmRollback"
      @cancel="rollbackTarget = null"
    >
      <template v-if="rollbackTarget">
        <p>
          将从评测系统题库删除批次
          <b>{{ rollbackTarget.batch_id }}</b> 已导入的题目（{{
            rollbackTarget.imported?.processed ?? 0
          }}
          题）。
        </p>
        <p class="text-gray-500">
          该操作只删除题库中的题目，不会删除产出文件。
        </p>
      </template>
    </Modal>
  </div>
</template>
