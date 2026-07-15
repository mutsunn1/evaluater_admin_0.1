<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import type { TablePaginationConfig } from 'ant-design-vue/es/table';

import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'ant-design-vue';

import {
  deleteQuestionBankSampleApi,
  getQuestionBankSamplesApi,
  searchQuestionBankSamplesApi,
  type QuestionBankSampleItem,
} from '#/api';

const loading = ref(false);
const items = ref<QuestionBankSampleItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const questionTypeOptions = [
  { label: '全部', value: '' },
  { label: '单选', value: 'multiple_choice' },
  { label: '多选', value: 'multiple_select' },
  { label: '判断', value: 'true_false' },
  { label: '填空', value: 'fill_in_blank' },
  { label: '阅读', value: 'reading_comprehension' },
];

const levelOptions = [
  { label: '全部', value: '' },
  { label: 'HSK1', value: 'HSK1' },
  { label: 'HSK2', value: 'HSK2' },
  { label: 'HSK3', value: 'HSK3' },
  { label: 'HSK4', value: 'HSK4' },
  { label: 'HSK5', value: 'HSK5' },
  { label: 'HSK6', value: 'HSK6' },
];

const dimensionOptions = [
  { label: '全部', value: '' },
  { label: '词汇', value: 'vocabulary' },
  { label: '语法', value: 'grammar' },
  { label: '阅读', value: 'reading' },
  { label: '听力', value: 'listening' },
  { label: '口语', value: 'speaking' },
];

const filters = ref({
  question_type: '',
  target_level: '',
  skill_dimension: '',
  q: '',
});

const columns = [
  { dataIndex: 'question_text', ellipsis: true, title: '题干' },
  { dataIndex: 'question_type', title: '题型', width: 100 },
  { dataIndex: 'target_level', title: '目标等级', width: 100 },
  { dataIndex: 'skill_dimension', title: '维度', width: 100 },
  { dataIndex: 'scene', ellipsis: true, title: '场景' },
  { dataIndex: 'grammar_focus', ellipsis: true, title: '语法重点' },
  { dataIndex: 'created_at', title: '创建时间', width: 180 },
  { key: 'action', title: '操作', width: 100 },
];

const typeLabelMap = Object.fromEntries(
  questionTypeOptions.filter((o) => o.value).map((o) => [o.value, o.label]),
);

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

async function fetchList() {
  loading.value = true;
  try {
    if (filters.value.q) {
      const res = await searchQuestionBankSamplesApi({
        q: filters.value.q,
        question_type: filters.value.question_type || undefined,
        target_level: filters.value.target_level || undefined,
        skill_dimension: filters.value.skill_dimension || undefined,
        top_k: 50,
      });
      items.value = res.items;
      total.value = res.items.length;
      page.value = 1;
    } else {
      const res = await getQuestionBankSamplesApi({
        page: page.value,
        page_size: pageSize.value,
        question_type: filters.value.question_type || undefined,
        target_level: filters.value.target_level || undefined,
        skill_dimension: filters.value.skill_dimension || undefined,
      });
      items.value = res.items;
      total.value = res.total;
    }
  } finally {
    loading.value = false;
  }
}

function handleTableChange(paginationConfig: TablePaginationConfig) {
  page.value = paginationConfig.current ?? 1;
  pageSize.value = paginationConfig.pageSize ?? 20;
  fetchList();
}

async function handleDelete(record: QuestionBankSampleItem) {
  try {
    await deleteQuestionBankSampleApi(record.id);
    message.success('删除成功');
    fetchList();
  } catch {
    message.error('删除失败');
  }
}

function formatTime(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

onMounted(fetchList);
</script>

<template>
  <div class="p-5">
    <Card title="题库样本列表">
      <Form layout="inline">
        <Row :gutter="[16, 16]" class="w-full">
          <Col :span="6">
            <Form.Item label="题型">
              <Select
                v-model:value="filters.question_type"
                :options="questionTypeOptions"
                allow-clear
                placeholder="全部"
                @change="page = 1; fetchList()"
              />
            </Form.Item>
          </Col>
          <Col :span="6">
            <Form.Item label="目标等级">
              <Select
                v-model:value="filters.target_level"
                :options="levelOptions"
                allow-clear
                placeholder="全部"
                @change="page = 1; fetchList()"
              />
            </Form.Item>
          </Col>
          <Col :span="6">
            <Form.Item label="维度">
              <Select
                v-model:value="filters.skill_dimension"
                :options="dimensionOptions"
                allow-clear
                placeholder="全部"
                @change="page = 1; fetchList()"
              />
            </Form.Item>
          </Col>
          <Col :span="6">
            <Form.Item label="搜索">
              <Input.Search
                v-model:value="filters.q"
                placeholder="题干 / 场景 / 语法"
                @search="page = 1; fetchList()"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Space class="mb-4 mt-4">
        <Button type="primary" @click="fetchList">刷新</Button>
      </Space>

      <Table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.dataIndex === 'question_type'">
            <Tag>{{ typeLabelMap[(row as QuestionBankSampleItem).question_type] || (row as QuestionBankSampleItem).question_type }}</Tag>
          </template>
          <template v-else-if="column.dataIndex === 'skill_dimension'">
            <Tag color="blue">{{ (row as QuestionBankSampleItem).skill_dimension }}</Tag>
          </template>
          <template v-else-if="column.dataIndex === 'created_at'">
            {{ formatTime((row as QuestionBankSampleItem).created_at) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Button danger size="small" type="link" @click="handleDelete(row as QuestionBankSampleItem)">
              删除
            </Button>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
