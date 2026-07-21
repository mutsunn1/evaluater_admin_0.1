<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue/es/table';

import type {
  ForgeDatasource,
  ForgeDatasourceRecords,
  ForgeDatasourceRefreshResult,
  ForgeVocabItem,
} from '#/api';

import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  getForgeBlacklistApi,
  getForgeVocabApi,
  removeForgeBlacklistItemApi,
} from '#/api';
import { useForgeStore } from '#/store';

import { useDatasources } from './use-datasources';

const forgeStore = useForgeStore();
const store = useDatasources();

// Top-level aliases so the template can rely on ref auto-unwrapping.
const datasources = store.datasources;
const dsLoading = store.loading;
const pending = store.pending;

// --- Datasource refresh flow -------------------------------------------------

const refreshTarget = ref<ForgeDatasource | null>(null);
const refreshResult = ref<ForgeDatasourceRefreshResult | null>(null);
const refreshing = ref(false);

const dsColumns = [
  { dataIndex: 'name', title: '名称', width: 140 },
  { dataIndex: 'license', title: '许可', width: 110 },
  { dataIndex: 'records', title: '记录数', width: 240 },
  { dataIndex: 'cleaned_at', title: '清洗时间', width: 170 },
  { dataIndex: 'status', title: '状态', width: 90 },
  { dataIndex: 'source_repo', ellipsis: true, title: '来源仓库' },
  { key: 'action', title: '操作', width: 110 },
];

function formatTime(value: null | string | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function licenseColor(license: string) {
  if (/^mit$/i.test(license)) return 'green';
  if (/^cc/i.test(license)) return 'gold';
  return 'default';
}

function statusColor(status: string) {
  return status === 'ok' ? 'green' : 'red';
}

function statusText(status: string) {
  return status === 'ok' ? '正常' : status;
}

function recordsText(records: ForgeDatasourceRecords) {
  const parts: string[] = [];
  if (typeof records.vocab === 'number') parts.push(`词汇 ${records.vocab}`);
  if (typeof records.grammar === 'number')
    parts.push(`语法 ${records.grammar}`);
  if (typeof records.chars === 'number') parts.push(`汉字 ${records.chars}`);
  return parts.length > 0 ? parts.join(' · ') : '-';
}

function openRefresh(datasource: ForgeDatasource) {
  refreshTarget.value = datasource;
  refreshResult.value = null;
}

function closeRefresh() {
  refreshTarget.value = null;
  refreshResult.value = null;
}

async function handleRefreshOk() {
  // Second click on the result view closes the modal.
  if (refreshResult.value) {
    closeRefresh();
    return;
  }
  const target = refreshTarget.value;
  if (!target) return;
  refreshing.value = true;
  try {
    const result = await store.refreshDatasource(target.name);
    if (!result) return;
    refreshResult.value = result;
    if (result.ok) {
      // Refetch so record counts and cleaned_at stay authoritative.
      store.fetchDatasources();
    }
  } catch {
    message.error('重新清洗请求失败');
    closeRefresh();
  } finally {
    refreshing.value = false;
  }
}

// --- Vocab browser -----------------------------------------------------------

const vocabFilters = ref<{ level: '' | number; q: string }>({
  level: '',
  q: '',
});
const vocabItems = ref<ForgeVocabItem[]>([]);
const vocabTotal = ref(0);
const vocabPage = ref(1);
const vocabPageSize = ref(20);
const vocabLoading = ref(false);

const levelOptions = [
  { label: '全部', value: '' },
  ...[1, 2, 3, 4, 5, 6].map((level) => ({
    label: `HSK${level}`,
    value: level,
  })),
];

const vocabColumns = [
  { dataIndex: 'word', title: '词', width: 140 },
  { dataIndex: 'pinyin', title: '拼音', width: 140 },
  { dataIndex: 'pos', title: '词性', width: 80 },
  { dataIndex: 'level_hsk20', title: 'HSK 2.0', width: 90 },
  { dataIndex: 'level_hsk30', title: 'HSK 3.0', width: 90 },
  { dataIndex: 'en', ellipsis: true, title: '英文释义' },
  { dataIndex: 'source', title: '来源', width: 110 },
];

const vocabPagination = computed(() => ({
  current: vocabPage.value,
  pageSize: vocabPageSize.value,
  total: vocabTotal.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

async function fetchVocab() {
  vocabLoading.value = true;
  try {
    const res = await getForgeVocabApi({
      page: vocabPage.value,
      page_size: vocabPageSize.value,
      level: vocabFilters.value.level || undefined,
      q: vocabFilters.value.q || undefined,
    });
    vocabItems.value = res.items;
    vocabTotal.value = res.total;
  } finally {
    vocabLoading.value = false;
  }
}

function handleVocabTableChange(pagination: TablePaginationConfig) {
  vocabPage.value = pagination.current ?? 1;
  vocabPageSize.value = pagination.pageSize ?? 20;
  fetchVocab();
}

function handleVocabSearch() {
  vocabPage.value = 1;
  fetchVocab();
}

// --- Blacklist ---------------------------------------------------------------

const blacklistItems = ref<string[]>([]);
const blacklistTotal = ref(0);
const blacklistLoading = ref(false);
const removingHash = ref<null | string>(null);

const blacklistColumns = [
  { dataIndex: 'hash', title: '内容哈希' },
  { key: 'action', title: '操作', width: 160 },
];

async function fetchBlacklist() {
  blacklistLoading.value = true;
  try {
    const res = await getForgeBlacklistApi();
    blacklistItems.value = res.items;
    blacklistTotal.value = res.total;
  } finally {
    blacklistLoading.value = false;
  }
}

function truncateHash(hash: string) {
  return hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
}

async function copyHash(hash: string) {
  try {
    await navigator.clipboard.writeText(hash);
    message.success('已复制完整哈希');
  } catch {
    message.error('复制失败');
  }
}

async function removeHash(hash: string) {
  removingHash.value = hash;
  try {
    const { removed } = await removeForgeBlacklistItemApi(hash);
    message.success(removed ? '已从黑名单移除' : '该哈希不在黑名单中');
    fetchBlacklist();
    // The datasource card shows the global blacklist count.
    store.fetchDatasources();
  } catch {
    message.error('移除失败');
  } finally {
    removingHash.value = null;
  }
}

// --- Lifecycle ---------------------------------------------------------------

function fetchAll() {
  store.fetchDatasources();
  fetchVocab();
  fetchBlacklist();
}

async function retryHealth() {
  const online = await forgeStore.checkHealth();
  if (online) {
    message.success('forge 服务已恢复');
    fetchAll();
  }
}

onMounted(async () => {
  if (!forgeStore.forgeOnline) {
    // The page is reachable via direct URL even when the menu is hidden.
    await forgeStore.checkHealth();
  }
  if (forgeStore.forgeOnline) {
    fetchAll();
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

    <Card class="mb-4" title="数据源">
      <template #extra>
        <Space>
          <span class="text-gray-500">黑名单 {{ store.blacklistCount.value }} 条</span>
          <Button
            :disabled="!forgeStore.forgeOnline"
            @click="store.fetchDatasources"
          >
            刷新
          </Button>
        </Space>
      </template>
      <Table
        :columns="dsColumns"
        :data-source="datasources"
        :loading="dsLoading"
        :pagination="false"
        row-key="name"
        size="small"
      >
        <template #bodyCell="{ column, record: row }">
          <template v-if="column.dataIndex === 'license'">
            <Tag :color="licenseColor((row as ForgeDatasource).license)">
              {{ (row as ForgeDatasource).license }}
            </Tag>
          </template>
          <template v-else-if="column.dataIndex === 'records'">
            {{ recordsText((row as ForgeDatasource).records) }}
          </template>
          <template v-else-if="column.dataIndex === 'cleaned_at'">
            {{ formatTime((row as ForgeDatasource).cleaned_at) }}
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <Tag :color="statusColor((row as ForgeDatasource).status)">
              {{ statusText((row as ForgeDatasource).status) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Button
              size="small"
              :loading="pending.has((row as ForgeDatasource).name)"
              :disabled="pending.has((row as ForgeDatasource).name)"
              @click="openRefresh(row as ForgeDatasource)"
            >
              重新清洗
            </Button>
          </template>
        </template>
      </Table>
    </Card>

    <Card class="mb-4" title="约束库浏览">
      <Form layout="inline" class="mb-4">
        <Form.Item label="级别">
          <Select
            v-model:value="vocabFilters.level"
            :options="levelOptions"
            style="width: 120px"
            @change="handleVocabSearch"
          />
        </Form.Item>
        <Form.Item label="关键词">
          <Input.Search
            v-model:value="vocabFilters.q"
            placeholder="词 / 拼音"
            style="width: 220px"
            @search="handleVocabSearch"
          />
        </Form.Item>
      </Form>
      <Table
        :columns="vocabColumns"
        :data-source="vocabItems"
        :loading="vocabLoading"
        :pagination="vocabPagination"
        row-key="word"
        size="small"
        @change="handleVocabTableChange"
      />
    </Card>

    <Card title="黑名单">
      <Collapse>
        <Collapse.Panel key="list" :header="`黑名单条目（${blacklistTotal}）`">
          <Table
            :columns="blacklistColumns"
            :data-source="blacklistItems.map((hash) => ({ hash }))"
            :loading="blacklistLoading"
            :pagination="{
              pageSize: 20,
              showTotal: (t: number) => `共 ${t} 条`,
            }"
            row-key="hash"
            size="small"
          >
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.dataIndex === 'hash'">
                <Tooltip :title="(row as { hash: string }).hash">
                  <code>{{
                    truncateHash((row as { hash: string }).hash)
                  }}</code>
                </Tooltip>
              </template>
              <template v-else-if="column.key === 'action'">
                <Space>
                  <Button
                    size="small"
                    type="link"
                    @click="copyHash((row as { hash: string }).hash)"
                  >
                    复制
                  </Button>
                  <Popconfirm
                    title="从黑名单移除该哈希？"
                    ok-text="移除"
                    cancel-text="取消"
                    @confirm="removeHash((row as { hash: string }).hash)"
                  >
                    <Button
                      size="small"
                      type="link"
                      danger
                      :loading="removingHash === (row as { hash: string }).hash"
                    >
                      移除
                    </Button>
                  </Popconfirm>
                </Space>
              </template>
            </template>
          </Table>
        </Collapse.Panel>
      </Collapse>
    </Card>

    <Modal
      :open="!!refreshTarget"
      :title="`重新清洗：${refreshTarget?.name ?? ''}`"
      :confirm-loading="refreshing"
      :ok-text="refreshResult ? '关闭' : '确认清洗'"
      @ok="handleRefreshOk"
      @cancel="closeRefresh"
    >
      <template v-if="refreshResult">
        <template v-if="refreshResult.ok">
          <p><Tag color="green">清洗成功</Tag></p>
          <p>之前：{{ refreshResult.before }} 条</p>
          <p>之后：{{ refreshResult.after }} 条</p>
          <p>
            差异：新增 {{ refreshResult.diff.added }} · 移除
            {{ refreshResult.diff.removed }}
          </p>
        </template>
        <template v-else>
          <p><Tag color="red">清洗失败</Tag></p>
          <p>{{ refreshResult.error || '未知错误' }}</p>
        </template>
      </template>
      <template v-else-if="refreshTarget">
        <p>
          将使用本地 raw 数据重新清洗数据源
          <b>{{ refreshTarget.name }}</b>（来源：{{ refreshTarget.source_repo }}）。
        </p>
        <p class="text-gray-500">
          此操作不会重新下载源仓库；raw 数据缺失时会返回明确错误。
        </p>
      </template>
    </Modal>
  </div>
</template>
