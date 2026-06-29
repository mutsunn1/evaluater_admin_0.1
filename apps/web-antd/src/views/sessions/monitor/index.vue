<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  Button,
  Card,
  Col,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';

import { getActiveSessionsApi } from '#/api';
import type { ActiveSessionItem, ActiveSessionsResult } from '#/api';

const data = ref<ActiveSessionsResult>({ items: [], total: 0 });
const loading = ref(false);
const phaseFilter = ref<'cold_start' | 'evaluation' | 'all'>('all');
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const filteredItems = computed(() => {
  if (phaseFilter.value === 'all') return data.value.items;
  return data.value.items.filter((item) => item.phase === phaseFilter.value);
});

const coldStartCount = computed(
  () => data.value.items.filter((item) => item.phase === 'cold_start').length,
);
const evaluationCount = computed(
  () => data.value.items.filter((item) => item.phase === 'evaluation').length,
);

const columns = [
  { dataIndex: 'session_id', title: '会话 ID' },
  { dataIndex: 'user_id', title: '用户 ID' },
  { dataIndex: 'round', title: '当前轮次' },
  { dataIndex: 'phase', title: '阶段' },
  { dataIndex: 'current_question_type', title: '当前题型' },
  { dataIndex: 'answers_count', title: '已作答数' },
  {
    dataIndex: 'last_activity_at',
    sorter: (a: ActiveSessionItem, b: ActiveSessionItem) =>
      (a.last_activity_at || 0) - (b.last_activity_at || 0),
    title: '最近活动时间',
  },
];

const phaseOptions = [
  { label: '全部', value: 'all' },
  { label: '冷启动', value: 'cold_start' },
  { label: '正式评测', value: 'evaluation' },
];

function formatTimestamp(value: number | null) {
  if (!value) return '-';
  const date = new Date(value * 1000);
  return date.toLocaleString();
}

async function fetchActiveSessions() {
  loading.value = true;
  try {
    data.value = await getActiveSessionsApi();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchActiveSessions();
  refreshTimer = setInterval(fetchActiveSessions, 30000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="p-5">
    <Row :gutter="16" class="mb-4">
      <Col :span="8">
        <Card :loading="loading" title="活跃会话总数">
          <Statistic :value="data.total" />
        </Card>
      </Col>
      <Col :span="8">
        <Card :loading="loading" title="冷启动中">
          <Statistic :value="coldStartCount" />
        </Card>
      </Col>
      <Col :span="8">
        <Card :loading="loading" title="正式评测中">
          <Statistic :value="evaluationCount" />
        </Card>
      </Col>
    </Row>

    <Card :loading="loading" title="活跃会话列表">
      <Space class="mb-4" wrap>
        <Select
          v-model:value="phaseFilter"
          :options="phaseOptions"
          class="w-40"
          placeholder="阶段筛选"
        />
        <Button @click="fetchActiveSessions">刷新</Button>
      </Space>

      <Table
        :columns="columns"
        :data-source="filteredItems"
        :pagination="false"
        row-key="session_id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'phase'">
            <Tag :color="record.phase === 'cold_start' ? 'orange' : 'green'"
              >
              {{ record.phase === 'cold_start' ? '冷启动' : '正式评测' }}
            </Tag>
          </template>
          <template v-else-if="column.dataIndex === 'last_activity_at'">
            {{ formatTimestamp(record.last_activity_at) }}
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
