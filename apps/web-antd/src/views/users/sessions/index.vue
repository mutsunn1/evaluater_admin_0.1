<script lang="ts" setup>
import type { UserSessionsResult } from '#/api';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Button, Card, Table } from 'ant-design-vue';

import { getUserSessionsApi } from '#/api';
import { formatDuration } from '#/utils/duration';

const route = useRoute();
const router = useRouter();
const data = ref<UserSessionsResult>({
  items: [],
  page: 1,
  page_size: 20,
  total: 0,
});
const loading = ref(false);

const userId = computed(() => decodeURIComponent(String(route.params.user_id)));

const columns = [
  { dataIndex: 'session_id', title: '会话 ID' },
  { dataIndex: 'started_at', title: '开始时间' },
  { dataIndex: 'ended_at', title: '结束时间' },
  { dataIndex: 'duration_ms', title: '总时长' },
  { dataIndex: 'total_response_time_ms', title: '答题耗时' },
  { dataIndex: 'question_count', title: '题目数' },
  { dataIndex: 'final_hsk_level', title: '最终 HSK' },
  {
    key: 'action',
    title: '操作',
  },
];

const pagination = computed(() => ({
  current: data.value.page,
  hideOnSinglePage: true,
  pageSize: data.value.page_size,
  total: data.value.total,
}));

function formatMs(value: null | number) {
  return formatDuration(value);
}

function formatTimestamp(value: null | number) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function fetchSessions(page: number = 1) {
  loading.value = true;
  try {
    data.value = await getUserSessionsApi(userId.value, {
      page,
      page_size: data.value.page_size,
    });
  } finally {
    loading.value = false;
  }
}

function onTableChange(pag: any) {
  fetchSessions(pag.current);
}

function goDetail(session_id: string) {
  router.push(`/sessions/${encodeURIComponent(session_id)}`);
}

function goBack() {
  router.back();
}

onMounted(() => fetchSessions());
</script>

<template>
  <Card title="评测记录" :loading="loading">
    <Button class="mb-4" @click="goBack">返回</Button>

    <Table
      :columns="columns"
      :data-source="data.items"
      :loading="loading"
      :pagination="pagination"
      row-key="session_id"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Button type="link" @click="goDetail(record.session_id)">详情</Button>
        </template>
        <template
          v-else-if="
            ['started_at', 'ended_at'].includes(String(column.dataIndex))
          "
        >
          {{ formatTimestamp(record[String(column.dataIndex)]) }}
        </template>
        <template
          v-else-if="
            ['duration_ms', 'total_response_time_ms'].includes(
              String(column.dataIndex),
            )
          "
        >
          {{ formatMs(record[String(column.dataIndex)]) }}
        </template>
        <template v-else-if="column.dataIndex === 'final_hsk_level'">
          <span v-if="record.final_hsk_level">HSK {{ record.final_hsk_level }}</span>
          <span v-else class="text-gray-400">-</span>
        </template>
      </template>
    </Table>
  </Card>
</template>
