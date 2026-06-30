<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  Col,
  Row,
  Select,
  Table,
} from 'ant-design-vue';

import { getUserTimingStatsApi } from '#/api';
import type { UserTimingStats } from '#/api';

const route = useRoute();
const router = useRouter();
const data = ref<UserTimingStats | null>(null);
const loading = ref(false);
const days = ref(30);

const userId = computed(() => decodeURIComponent(String(route.params.user_id)));

const typeColumns = [
  { dataIndex: 'question_type', title: '题型' },
  { dataIndex: 'count', title: '答题数' },
  { dataIndex: 'avg_response_time_ms', title: '平均耗时 (ms)' },
  { dataIndex: 'accuracy_rate', title: '正确率 (%)' },
];

const dimensionColumns = [
  { dataIndex: 'skill_dimension', title: '技能维度' },
  { dataIndex: 'count', title: '答题数' },
  { dataIndex: 'avg_response_time_ms', title: '平均耗时 (ms)' },
  { dataIndex: 'accuracy_rate', title: '正确率 (%)' },
];

const dayOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
];

function formatMs(value: number | null) {
  if (value === null || value === undefined) return '-';
  return `${value} ms`;
}

async function fetchStats() {
  loading.value = true;
  try {
    data.value = await getUserTimingStatsApi(userId.value, days.value);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.back();
}

onMounted(fetchStats);
</script>

<template>
  <div class="p-5">
    <Button class="mb-4" @click="goBack">返回</Button>

    <Card :loading="loading" title="耗时统计">
      <div class="mb-4">
        <Select
          v-model:value="days"
          :options="dayOptions"
          class="w-40"
          @change="fetchStats"
        />
      </div>

      <Row :gutter="16">
        <Col :span="12">
          <Card :loading="loading" title="按题型">
            <Table
              :columns="typeColumns"
              :data-source="data?.by_question_type || []"
              :pagination="false"
              row-key="question_type"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'avg_response_time_ms'">
                  {{ formatMs(record.avg_response_time_ms) }}
                </template>
                <template v-else-if="column.dataIndex === 'accuracy_rate'">
                  <span v-if="record.accuracy_rate !== null">{{ record.accuracy_rate }}%</span>
                  <span v-else class="text-gray-400">-</span>
                </template>
              </template>
            </Table>
          </Card>
        </Col>
        <Col :span="12">
          <Card :loading="loading" title="按技能维度">
            <Table
              :columns="dimensionColumns"
              :data-source="data?.by_skill_dimension || []"
              :pagination="false"
              row-key="skill_dimension"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'avg_response_time_ms'">
                  {{ formatMs(record.avg_response_time_ms) }}
                </template>
                <template v-else-if="column.dataIndex === 'accuracy_rate'">
                  <span v-if="record.accuracy_rate !== null">{{ record.accuracy_rate }}%</span>
                  <span v-else class="text-gray-400">-</span>
                </template>
              </template>
            </Table>
          </Card>
        </Col>
      </Row>
    </Card>
  </div>
</template>
