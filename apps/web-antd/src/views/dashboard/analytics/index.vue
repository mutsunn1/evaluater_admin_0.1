<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
} from 'ant-design-vue';
import type { ECOption } from '@vben/plugins/echarts';

import { getDashboardApi } from '#/api';
import type { DashboardData } from '#/api';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const trendChartRef = ref<any>(null);
const languageChartRef = ref<any>(null);
const skillChartRef = ref<any>(null);

const { renderEcharts: renderTrend } = useEcharts(trendChartRef);
const { renderEcharts: renderLanguage } = useEcharts(languageChartRef);
const { renderEcharts: renderSkill } = useEcharts(skillChartRef);

const data = ref<DashboardData>({
  avg_hsk_level: 0,
  hsk_distribution: [],
  native_language_distribution: [],
  new_users_trend: [],
  skill_dimension_avg: {},
  total_users: 0,
});
const loading = ref(false);

const columns = [
  { dataIndex: 'hsk_level', title: 'HSK 等级' },
  { dataIndex: 'count', title: '用户数' },
];

const distribution = computed(() => data.value.hsk_distribution);

const trendOption = computed<ECOption>(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: {
    data: data.value.new_users_trend.map((item) => item.date.slice(5)),
    type: 'category',
  },
  yAxis: { minInterval: 1, type: 'value' },
  series: [
    {
      data: data.value.new_users_trend.map((item) => item.count),
      smooth: true,
      type: 'line',
    },
  ],
}));

const languageOption = computed<ECOption>(() => ({
  legend: { bottom: 0 },
  series: [
    {
      data: data.value.native_language_distribution.map((item) => ({
        name: item.language,
        value: item.count,
      })),
      radius: ['40%', '70%'],
      type: 'pie',
    },
  ],
  tooltip: { trigger: 'item' },
}));

const skillOption = computed<ECOption>(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: {
    data: Object.keys(data.value.skill_dimension_avg),
    type: 'category',
  },
  yAxis: { type: 'value' },
  series: [
    {
      data: Object.values(data.value.skill_dimension_avg),
      type: 'bar',
    },
  ],
}));

onMounted(async () => {
  loading.value = true;
  try {
    data.value = await getDashboardApi();
  } finally {
    loading.value = false;
  }
});

watch(
  () => data.value,
  async () => {
    await Promise.all([
      renderTrend(trendOption.value),
      renderLanguage(languageOption.value),
      renderSkill(skillOption.value),
    ]);
  },
  { deep: true },
);
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

    <Row :gutter="16" class="mt-4">
      <Col :span="12">
        <Card :loading="loading" title="近 7 日新增用户">
          <EchartsUI ref="trendChartRef" />
        </Card>
      </Col>
      <Col :span="12">
        <Card :loading="loading" title="母语分布">
          <EchartsUI ref="languageChartRef" />
        </Card>
      </Col>
    </Row>

    <Row :gutter="16" class="mt-4">
      <Col :span="24">
        <Card :loading="loading" title="技能维度平均分">
          <EchartsUI ref="skillChartRef" />
        </Card>
      </Col>
    </Row>
  </div>
</template>
