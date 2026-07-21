<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue/es/table';

import type { EchartsUIType } from '@vben/plugins/echarts';

import type {
  ForgeCostMetrics,
  ForgeMetricsSummary,
  ForgeRecentItem,
} from '#/api';

import { computed, onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import {
  Alert,
  Button,
  Card,
  Col,
  message,
  Row,
  Statistic,
  Table,
} from 'ant-design-vue';

import {
  getForgeCostMetricsApi,
  getForgeMetricsSummaryApi,
  getForgeRecentItemsApi,
} from '#/api';
import { useForgeStore } from '#/store';

import {
  toCostSeries,
  toCritiqueDimensions,
  toFailureRows,
  toGateRows,
  totalProducedItems,
} from './metrics-transform';

const forgeStore = useForgeStore();

const summary = ref<ForgeMetricsSummary | null>(null);
const cost = ref<ForgeCostMetrics | null>(null);
const summaryLoading = ref(false);

const recentItems = ref<ForgeRecentItem[]>([]);
const recentTotal = ref(0);
const recentPage = ref(1);
const recentPageSize = ref(10);
const recentLoading = ref(false);

const totalItems = computed(() =>
  summary.value ? totalProducedItems(summary.value) : 0,
);

const gatesChartRef = ref<EchartsUIType>();
const { renderEcharts: renderGatesChart } = useEcharts(gatesChartRef);
const critiqueChartRef = ref<EchartsUIType>();
const { renderEcharts: renderCritiqueChart } = useEcharts(critiqueChartRef);
const failureChartRef = ref<EchartsUIType>();
const { renderEcharts: renderFailureChart } = useEcharts(failureChartRef);
const costChartRef = ref<EchartsUIType>();
const { renderEcharts: renderCostChart } = useEcharts(costChartRef);

const recentColumns = [
  { dataIndex: 'stem', ellipsis: true, title: '题干' },
  { dataIndex: 'level', title: '等级', width: 90 },
  { dataIndex: 'skill', title: '技能', width: 110 },
  { dataIndex: 'question_type', title: '题型', width: 170 },
  { dataIndex: 'source_file', ellipsis: true, title: '来源文件', width: 220 },
];

const recentPagination = computed(() => ({
  current: recentPage.value,
  pageSize: recentPageSize.value,
  total: recentTotal.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

function renderSummaryCharts(data: ForgeMetricsSummary) {
  const gates = toGateRows(data);
  renderGatesChart({
    grid: {
      bottom: 0,
      containLabel: true,
      left: '3%',
      right: '3%',
      top: '12%',
    },
    series: [
      {
        barMaxWidth: 40,
        data: gates.map((gate) => Math.round(gate.passRate * 1000) / 10),
        itemStyle: { color: '#5ab1ef' },
        label: { formatter: '{c}%', position: 'top', show: true },
        type: 'bar',
      },
    ],
    tooltip: {
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const index = list[0]?.dataIndex ?? 0;
        const gate = gates[index];
        if (!gate) return '';
        return `${gate.label}<br/>通过率：${(gate.passRate * 100).toFixed(1)}%<br/>通过 ${gate.passed} · 未过 ${gate.failed}`;
      },
      trigger: 'axis',
    },
    xAxis: {
      axisTick: { show: false },
      data: gates.map((gate) => gate.label),
      type: 'category',
    },
    yAxis: { axisLabel: { formatter: '{value}%' }, max: 100, type: 'value' },
  });

  const dimensions = toCritiqueDimensions(data);
  const radarMax = Math.max(
    5,
    Math.ceil(Math.max(...dimensions.map((dimension) => dimension.value), 0)),
  );
  renderCritiqueChart({
    radar: {
      indicator: dimensions.map((dimension) => ({
        max: radarMax,
        name: dimension.label,
      })),
      radius: '65%',
    },
    series: [
      {
        areaStyle: { opacity: 0.2 },
        data: [
          {
            name: '均分',
            value: dimensions.map((dimension) => dimension.value),
          },
        ],
        itemStyle: { color: '#019680' },
        type: 'radar',
      },
    ],
    tooltip: {},
  });

  const failures = toFailureRows(data, 10);
  renderFailureChart({
    grid: { bottom: 0, containLabel: true, left: '3%', right: '8%', top: '2%' },
    series: [
      {
        barMaxWidth: 18,
        data: failures.map((row) => row.count),
        itemStyle: { color: '#f6a35c' },
        label: { position: 'right', show: true },
        type: 'bar',
      },
    ],
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: {
      axisLabel: { overflow: 'truncate', width: 140 },
      data: failures.map((row) => row.reason),
      inverse: true,
      type: 'category',
    },
  });
}

function renderCostChartData(data: ForgeCostMetrics) {
  const series = toCostSeries(data);
  renderCostChart({
    grid: {
      bottom: 0,
      containLabel: true,
      left: '3%',
      right: '3%',
      top: '14%',
    },
    legend: { data: ['Tokens', '成本'] },
    series: [
      {
        data: series.tokens,
        itemStyle: { color: '#5ab1ef' },
        name: 'Tokens',
        smooth: true,
        type: 'line',
      },
      {
        data: series.costs,
        itemStyle: { color: '#019680' },
        name: '成本',
        smooth: true,
        type: 'line',
        yAxisIndex: 1,
      },
    ],
    tooltip: { trigger: 'axis' },
    xAxis: {
      axisTick: { show: false },
      boundaryGap: false,
      data: series.dates,
      type: 'category',
    },
    yAxis: [
      { name: 'Tokens', type: 'value' },
      {
        axisLabel: { formatter: (val: number) => `$${val}` },
        name: '成本',
        type: 'value',
      },
    ],
  });
}

async function fetchSummaryAndCost() {
  summaryLoading.value = true;
  try {
    const [summaryData, costData] = await Promise.all([
      getForgeMetricsSummaryApi(),
      getForgeCostMetricsApi(),
    ]);
    summary.value = summaryData;
    cost.value = costData;
    renderSummaryCharts(summaryData);
    renderCostChartData(costData);
  } finally {
    summaryLoading.value = false;
  }
}

async function fetchRecent() {
  recentLoading.value = true;
  try {
    const res = await getForgeRecentItemsApi({
      page: recentPage.value,
      page_size: recentPageSize.value,
    });
    recentItems.value = res.items;
    recentTotal.value = res.total;
  } finally {
    recentLoading.value = false;
  }
}

function handleRecentTableChange(pagination: TablePaginationConfig) {
  recentPage.value = pagination.current ?? 1;
  recentPageSize.value = pagination.pageSize ?? 10;
  fetchRecent();
}

async function retryHealth() {
  const online = await forgeStore.checkHealth();
  if (online) {
    message.success('forge 服务已恢复');
    fetchSummaryAndCost();
    fetchRecent();
  }
}

onMounted(async () => {
  if (!forgeStore.forgeOnline) {
    // The page is reachable via direct URL even when the menu is hidden.
    await forgeStore.checkHealth();
  }
  if (!forgeStore.forgeOnline) return;
  fetchSummaryAndCost();
  fetchRecent();
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

    <Row :gutter="16">
      <Col :span="8">
        <Card :loading="summaryLoading">
          <Statistic title="总题数" :value="totalItems" />
        </Card>
      </Col>
      <Col :span="8">
        <Card :loading="summaryLoading">
          <Statistic title="总 Token" :value="cost?.total_tokens ?? 0" />
        </Card>
      </Col>
      <Col :span="8">
        <Card :loading="summaryLoading">
          <Statistic
            title="总成本"
            :value="cost?.total_cost ?? 0"
            :precision="4"
            prefix="$"
          />
        </Card>
      </Col>
    </Row>

    <Row :gutter="16" class="mt-4">
      <Col :span="12">
        <Card title="QA 关通过率">
          <EchartsUI ref="gatesChartRef" />
        </Card>
      </Col>
      <Col :span="12">
        <Card title="评审四维均分">
          <EchartsUI ref="critiqueChartRef" />
        </Card>
      </Col>
    </Row>

    <Row :gutter="16" class="mt-4">
      <Col :span="12">
        <Card title="失败原因 Top10">
          <div
            v-if="summary && summary.failure_reasons.length === 0"
            class="text-gray-500"
          >
            暂无失败记录。
          </div>
          <EchartsUI v-else ref="failureChartRef" height="360px" />
        </Card>
      </Col>
      <Col :span="12">
        <Card title="成本趋势（按天）">
          <div v-if="cost && cost.by_day.length === 0" class="text-gray-500">
            暂无成本数据。
          </div>
          <EchartsUI v-else ref="costChartRef" height="360px" />
        </Card>
      </Col>
    </Row>

    <Card class="mt-4" title="最近产出题">
      <Table
        :columns="recentColumns"
        :data-source="recentItems"
        :loading="recentLoading"
        :pagination="recentPagination"
        row-key="id"
        size="small"
        @change="handleRecentTableChange"
      />
    </Card>
  </div>
</template>
