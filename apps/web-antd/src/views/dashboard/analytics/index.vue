<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
} from 'ant-design-vue';

import { getDashboardApi } from '#/api';
import type { DashboardData } from '#/api';

const data = ref<DashboardData>({
  avg_hsk_level: 0,
  hsk_distribution: [],
  total_users: 0,
});
const loading = ref(false);

const columns = [
  { dataIndex: 'hsk_level', title: 'HSK 等级' },
  { dataIndex: 'count', title: '用户数' },
];

const distribution = computed(() => data.value.hsk_distribution);

onMounted(async () => {
  loading.value = true;
  try {
    data.value = await getDashboardApi();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-5">
    <Row :gutter="16">
      <Col :span="8">
        <Card :loading="loading" title="总用户数">
          <Statistic :value="data.total_users" />
        </Card>
      </Col>
      <Col :span="8">
        <Card :loading="loading" title="平均 HSK 等级">
          <Statistic :precision="2" :value="data.avg_hsk_level" />
        </Card>
      </Col>
      <Col :span="8">
        <Card :loading="loading" title="HSK 分布">
          <Table
            :columns="columns"
            :data-source="distribution"
            :pagination="false"
            size="small"
          />
        </Card>
      </Col>
    </Row>
  </div>
</template>
