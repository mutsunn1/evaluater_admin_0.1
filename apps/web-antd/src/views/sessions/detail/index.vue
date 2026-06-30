<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  Descriptions,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';

import { getSessionDetailApi } from '#/api';
import type { SessionDetail } from '#/api';

const route = useRoute();
const router = useRouter();
const data = ref<SessionDetail | null>(null);
const loading = ref(false);

const sessionId = computed(() => decodeURIComponent(String(route.params.session_id)));

const questionColumns = [
  { dataIndex: 'item_id', title: '题号' },
  { dataIndex: 'question_type', title: '题型' },
  { dataIndex: 'skill_dimension', title: '技能维度' },
  { dataIndex: 'response_time_ms', title: '答题耗时 (ms)' },
  { dataIndex: 'is_correct', title: '是否正确' },
  { dataIndex: 'score', title: '得分' },
];

const roundColumns = [
  { dataIndex: 'round_index', title: '轮次' },
  { dataIndex: 'question_count', title: '题目数' },
  { dataIndex: 'avg_response_time_ms', title: '平均耗时 (ms)' },
  { dataIndex: 'correct_count', title: '正确数' },
];

const accuracyRate = computed(() => {
  if (!data.value || data.value.question_count === 0) return 0;
  const correct = data.value.questions.filter((q) => q.is_correct).length;
  return Math.round((correct / data.value.question_count) * 100);
});

function formatMs(value: number | null) {
  if (value === null || value === undefined) return '-';
  return `${value} ms`;
}

function formatTimestamp(value: number | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function fetchDetail() {
  loading.value = true;
  try {
    data.value = await getSessionDetailApi(sessionId.value);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.back();
}

onMounted(fetchDetail);
</script>

<template>
  <div v-if="data" class="p-5">
    <Button class="mb-4" @click="goBack">返回</Button>

    <Card :loading="loading" title="会话概览">
      <Descriptions bordered :column="2">
        <Descriptions.Item label="会话 ID">{{ data.session_id }}</Descriptions.Item>
        <Descriptions.Item label="用户 ID">{{ data.user_id }}</Descriptions.Item>
        <Descriptions.Item label="开始时间">{{ formatTimestamp(data.started_at) }}</Descriptions.Item>
        <Descriptions.Item label="结束时间">{{ formatTimestamp(data.ended_at) }}</Descriptions.Item>
        <Descriptions.Item label="总时长">{{ formatMs(data.duration_ms) }}</Descriptions.Item>
        <Descriptions.Item label="答题总耗时">{{ formatMs(data.total_response_time_ms) }}</Descriptions.Item>
        <Descriptions.Item label="题目数">{{ data.question_count }}</Descriptions.Item>
        <Descriptions.Item label="最终 HSK">
          <Tag v-if="data.final_hsk_level" color="blue">HSK {{ data.final_hsk_level }}</Tag>
          <span v-else class="text-gray-400">未知</span>
        </Descriptions.Item>
      </Descriptions>
    </Card>

    <Row :gutter="16" class="mt-4">
      <Col :span="8">
        <Card :loading="loading" title="正确率">
          <Statistic :value="accuracyRate" suffix="%" />
        </Card>
      </Col>
      <Col :span="8">
        <Card :loading="loading" title="平均答题耗时">
          <Statistic :value="(data.total_response_time_ms || 0) / (data.question_count || 1)" suffix="ms" />
        </Card>
      </Col>
      <Col :span="8">
        <Card :loading="loading" title="总轮次">
          <Statistic :value="data.round_summaries.length" />
        </Card>
      </Col>
    </Row>

    <Card class="mt-4" :loading="loading" title="每轮统计">
      <Table
        :columns="roundColumns"
        :data-source="data.round_summaries"
        :pagination="false"
        row-key="round_index"
      />
    </Card>

    <Card class="mt-4" :loading="loading" title="题级明细">
      <Table
        :columns="questionColumns"
        :data-source="data.questions"
        :pagination="false"
        row-key="item_id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'is_correct'">
            <Tag :color="record.is_correct ? 'green' : 'red'">
              {{ record.is_correct ? '正确' : '错误' }}
            </Tag>
          </template>
          <template v-else-if="column.dataIndex === 'response_time_ms'">
            {{ formatMs(record.response_time_ms) }}
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>

<script lang="ts">
import { Col, Row } from 'ant-design-vue';
export default {
  components: { Col, Row },
};
</script>
