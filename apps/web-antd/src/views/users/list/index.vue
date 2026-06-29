<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { getUsersApi } from '#/api';
import type { UserListResult } from '#/api';

const router = useRouter();
const data = ref<UserListResult>({
  items: [],
  page: 1,
  page_size: 20,
  total: 0,
});
const loading = ref(false);
const filters = reactive({
  hsk_level: undefined as number | undefined,
  q: '',
});

const columns = [
  { dataIndex: 'user_id', title: '用户 ID' },
  { dataIndex: 'hsk_level', title: 'HSK 等级' },
  { dataIndex: 'native_language', title: '母语' },
  { dataIndex: 'updated_at', title: '更新时间' },
  {
    key: 'action',
    title: '操作',
  },
];

const hskOptions = computed(() =>
  Array.from({ length: 7 }, (_, i) => ({ label: `HSK ${i || '未分级'}`, value: i })),
);

const pagination = computed(() => ({
  current: data.value.page,
  hideOnSinglePage: true,
  pageSize: data.value.page_size,
  total: data.value.total,
}));

async function fetchUsers(page: number = 1) {
  loading.value = true;
  try {
    data.value = await getUsersApi({
      hsk_level: filters.hsk_level,
      page,
      page_size: data.value.page_size,
      q: filters.q || undefined,
    });
  } finally {
    loading.value = false;
  }
}

function onTableChange(pag: any) {
  fetchUsers(pag.current);
}

function goDetail(user_id: string) {
  router.push(`/users/${encodeURIComponent(user_id)}`);
}

onMounted(() => fetchUsers());
</script>

<template>
  <Card title="用户列表">
    <Space class="mb-4" wrap>
      <Select
        v-model:value="filters.hsk_level"
        :allow-clear="true"
        :options="hskOptions"
        class="w-32"
        placeholder="HSK 等级"
        @change="fetchUsers(1)"
      />
      <Input
        v-model:value="filters.q"
        class="w-64"
        placeholder="搜索用户 ID"
        @press-enter="fetchUsers(1)"
      />
      <Button type="primary" @click="fetchUsers(1)">查询</Button>
    </Space>

    <Table
      :columns="columns"
      :data-source="data.items"
      :loading="loading"
      :pagination="pagination"
      row-key="user_id"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Button type="link" @click="goDetail(record.user_id)">详情</Button>
        </template>
        <template v-else-if="column.dataIndex === 'hsk_level'">
          <Tag color="blue">HSK {{ record.hsk_level }}</Tag>
        </template>
      </template>
    </Table>
  </Card>
</template>
