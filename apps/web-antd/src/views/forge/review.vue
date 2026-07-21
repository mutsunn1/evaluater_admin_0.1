<script lang="ts" setup>
import type {
  ForgeReviewItem,
  ForgeReviewItemStatus,
  ForgeReviewSessionSummary,
} from '#/api';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Collapse,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Select,
  Slider,
  Space,
  Tag,
  Textarea,
} from 'ant-design-vue';

import { createForgeReviewSessionApi, getForgeReviewSessionsApi } from '#/api';
import { useForgeStore } from '#/store';

import { useReviewSession } from './use-review-session';

const forgeStore = useForgeStore();
const review = useReviewSession();

// Top-level aliases so the template can rely on ref auto-unwrapping.
const item = review.currentItem;
const items = review.items;
const currentIndex = review.currentIndex;
const sessionId = review.sessionId;
const progress = review.progress;
const pendingCount = review.pendingCount;
const acting = review.acting;
const audioUrl = review.audioUrl;
const audioLoading = review.audioLoading;

const sessions = ref<ForgeReviewSessionSummary[]>([]);
const sessionsLoading = ref(false);
const selectedSessionId = ref<string>();
const creating = ref(false);
const rate = ref(0.05);
const seed = ref<number>();

const rejectVisible = ref(false);
const rejectReason = ref('');
const rejecting = ref(false);

const editVisible = ref(false);
const editing = ref(false);
const editForm = ref({
  stem: '',
  options: '',
  answer: '',
  explanation: '',
});

const sessionOptions = computed(() =>
  sessions.value.map((session) => ({
    label: `${formatTime(session.created_at)} · 已审 ${session.reviewed}/${session.total} · ${session.status}`,
    value: session.session_id,
  })),
);

const progressPercent = computed(() => {
  const { reviewed, total } = progress.value;
  return total > 0 ? Math.round((reviewed / total) * 100) : 0;
});

/**
 * An option counts as correct when the answer references its letter (A, B,
 * ...), appears in a letter list ("A,B"), or matches the option text.
 */
function isCorrectOption(target: ForgeReviewItem, index: number) {
  const answer = target.answer.trim();
  if (!answer) return false;
  const letter = String.fromCodePoint(65 + index);
  if (answer === letter) return true;
  if (answer === target.options[index]?.trim()) return true;
  return answer
    .split(/[,，\s]+/)
    .map((part) => part.trim())
    .includes(letter);
}

/** Options of the current item with letters and correctness precomputed. */
const optionRows = computed(() => {
  const current = item.value;
  if (!current) return [];
  return current.options.map((text, index) => ({
    correct: isCorrectOption(current, index),
    letter: String.fromCodePoint(65 + index),
    text,
  }));
});

function formatTime(value: null | string | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function itemStatusColor(status: ForgeReviewItemStatus | undefined) {
  switch (status) {
    case 'edited': {
      return 'blue';
    }
    case 'passed': {
      return 'green';
    }
    case 'rejected': {
      return 'red';
    }
    default: {
      return 'default';
    }
  }
}

function itemStatusText(status: ForgeReviewItemStatus | undefined) {
  switch (status) {
    case 'edited': {
      return '已编辑';
    }
    case 'passed': {
      return '已通过';
    }
    case 'rejected': {
      return '已淘汰';
    }
    default: {
      return '待审';
    }
  }
}

async function fetchSessions() {
  sessionsLoading.value = true;
  try {
    const res = await getForgeReviewSessionsApi();
    sessions.value = res.sessions;
  } finally {
    sessionsLoading.value = false;
  }
}

async function handleCreateSession() {
  creating.value = true;
  try {
    const params: { rate: number; seed?: number } = { rate: rate.value };
    if (seed.value !== undefined && seed.value !== null) {
      params.seed = seed.value;
    }
    const { session_id, total } = await createForgeReviewSessionApi(params);
    message.success(`审阅会话已创建（抽样 ${total} 题）`);
    await fetchSessions();
    selectedSessionId.value = session_id;
    await review.loadSession(session_id);
  } catch {
    message.error('创建审阅会话失败');
  } finally {
    creating.value = false;
  }
}

async function handleSessionChange(value: unknown) {
  if (typeof value !== 'string') return;
  try {
    await review.loadSession(value);
  } catch {
    message.error('加载审阅会话失败');
  }
}

async function handlePass() {
  try {
    await review.passCurrent();
  } catch {
    message.error('操作失败');
  }
}

function openRejectModal() {
  if (!item.value || item.value.status !== 'pending') return;
  rejectReason.value = '';
  rejectVisible.value = true;
}

async function confirmReject() {
  rejecting.value = true;
  try {
    await review.rejectCurrent(rejectReason.value.trim() || undefined);
    rejectVisible.value = false;
  } catch {
    message.error('操作失败');
  } finally {
    rejecting.value = false;
  }
}

function openEditModal() {
  const current = item.value;
  if (!current) return;
  editForm.value = {
    stem: current.stem,
    options: current.options.join('\n'),
    answer: current.answer,
    explanation: current.explanation,
  };
  editVisible.value = true;
}

/** FastAPI answers 422 with { detail: [{ msg }] | string } as the body. */
function extractEditError(error: any): string {
  const detail = error?.detail;
  if (Array.isArray(detail)) {
    return detail.map((entry) => entry?.msg ?? String(entry)).join('；');
  }
  return typeof detail === 'string' ? detail : '';
}

async function confirmEdit() {
  const options = editForm.value.options
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  editing.value = true;
  try {
    await review.editCurrent({
      stem: editForm.value.stem.trim(),
      options,
      answer: editForm.value.answer.trim(),
      explanation: editForm.value.explanation.trim(),
    });
    message.success('修改已保存');
    editVisible.value = false;
  } catch (error: any) {
    const reason = extractEditError(error);
    message.error(reason ? `保存失败：${reason}` : '保存失败');
  } finally {
    editing.value = false;
  }
}

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  const tag = element?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || element?.isContentEditable;
}

/** Keyboard shortcuts: ←/→ navigate, P pass, R reject. */
function handleKeydown(event: KeyboardEvent) {
  if (
    rejectVisible.value ||
    editVisible.value ||
    isEditableTarget(event.target)
  ) {
    return;
  }
  if (!item.value) return;
  switch (event.key) {
    case 'ArrowLeft': {
      review.goPrev();
      event.preventDefault();
      break;
    }
    case 'ArrowRight': {
      review.goNext();
      event.preventDefault();
      break;
    }
    case 'p':
    case 'P': {
      void handlePass();
      break;
    }
    case 'r':
    case 'R': {
      openRejectModal();
      break;
    }
  }
}

async function retryHealth() {
  const online = await forgeStore.checkHealth();
  if (online) {
    message.success('forge 服务已恢复');
    fetchSessions();
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  if (!forgeStore.forgeOnline) {
    // The page is reachable via direct URL even when the menu is hidden.
    await forgeStore.checkHealth();
  }
  if (forgeStore.forgeOnline) {
    fetchSessions();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  review.cleanup();
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

    <Card class="mb-4" title="审阅会话">
      <Space wrap size="large">
        <Space>
          <span class="text-gray-500">抽样率</span>
          <Slider
            v-model:value="rate"
            :min="0.01"
            :max="1"
            :step="0.01"
            style="width: 160px"
          />
          <span>{{ Math.round(rate * 100) }}%</span>
        </Space>
        <Space>
          <span class="text-gray-500">随机种子</span>
          <InputNumber
            v-model:value="seed"
            :min="0"
            placeholder="可选"
            style="width: 110px"
          />
        </Space>
        <Button
          type="primary"
          :loading="creating"
          :disabled="!forgeStore.forgeOnline"
          @click="handleCreateSession"
        >
          开始新会话
        </Button>
        <Select
          v-model:value="selectedSessionId"
          :loading="sessionsLoading"
          :options="sessionOptions"
          placeholder="选择历史会话"
          style="min-width: 340px"
          @change="handleSessionChange"
        />
      </Space>
    </Card>

    <Card v-if="sessionId" title="逐题审阅">
      <template #extra>
        <Space size="large">
          <span>
            已审 {{ progress.reviewed }}/{{ progress.total }}（待审
            {{ pendingCount }}）
          </span>
          <Progress
            :percent="progressPercent"
            :show-info="false"
            style="width: 180px"
          />
        </Space>
      </template>

      <div v-if="items.length === 0" class="text-gray-500">
        该会话没有审阅条目。
      </div>

      <template v-else-if="item">
        <Space class="mb-3">
          <Button :disabled="currentIndex === 0" @click="review.goPrev">
            ← 上一题
          </Button>
          <span>第 {{ currentIndex + 1 }} / {{ items.length }} 题</span>
          <Button
            :disabled="currentIndex >= items.length - 1"
            @click="review.goNext"
          >
            下一题 →
          </Button>
        </Space>

        <div class="mb-3">
          <Tag color="blue">{{ item.level }}</Tag>
          <Tag color="cyan">{{ item.skill }}</Tag>
          <Tag>{{ item.question_type }}</Tag>
          <Tag :color="itemStatusColor(item.status)">
            {{ itemStatusText(item.status) }}
          </Tag>
          <span class="text-gray-400 text-xs">来源：{{ item.source_file }}</span>
        </div>

        <div class="mb-3 text-base">{{ item.stem }}</div>

        <ul v-if="optionRows.length" class="mb-3 list-none pl-0">
          <li
            v-for="row in optionRows"
            :key="row.letter"
            class="mb-1"
            :class="row.correct ? 'text-green-600 font-medium' : ''"
          >
            {{ row.letter }}. {{ row.text }}
            <Tag v-if="row.correct" color="green" class="ml-1">正确答案</Tag>
          </li>
        </ul>

        <div class="mb-3">
          <span class="text-gray-500">答案：</span>{{ item.answer }}
        </div>
        <div v-if="item.explanation" class="mb-3">
          <span class="text-gray-500">解析：</span>{{ item.explanation }}
        </div>

        <template v-if="item.media">
          <div v-if="item.media.audio" class="mb-3">
            <audio
              v-if="audioUrl"
              :src="audioUrl ?? undefined"
              controls
            ></audio>
            <span v-else class="text-gray-400">
              {{ audioLoading ? '音频加载中…' : '音频不可用' }}
            </span>
          </div>
          <Collapse v-if="item.media.transcript" class="mb-3">
            <Collapse.Panel key="transcript" header="听力原文">
              {{ item.media.transcript }}
            </Collapse.Panel>
          </Collapse>
        </template>

        <Space>
          <Button
            type="primary"
            class="bg-green-600"
            :loading="acting"
            :disabled="item.status !== 'pending'"
            @click="handlePass"
          >
            通过（P）
          </Button>
          <Button
            danger
            :disabled="item.status !== 'pending'"
            @click="openRejectModal"
          >
            淘汰（R）
          </Button>
          <Button @click="openEditModal">编辑</Button>
        </Space>
      </template>
    </Card>

    <Modal
      v-model:open="rejectVisible"
      title="淘汰原因"
      :confirm-loading="rejecting"
      ok-text="确认淘汰"
      cancel-text="取消"
      @ok="confirmReject"
    >
      <Textarea
        v-model:value="rejectReason"
        :rows="3"
        placeholder="可选：填写淘汰原因"
      />
    </Modal>

    <Modal
      v-model:open="editVisible"
      title="编辑题目"
      :confirm-loading="editing"
      ok-text="保存"
      cancel-text="取消"
      width="640px"
      @ok="confirmEdit"
    >
      <div class="mb-3">
        <div class="mb-1 text-gray-500">题干</div>
        <Textarea v-model:value="editForm.stem" :rows="3" />
      </div>
      <div class="mb-3">
        <div class="mb-1 text-gray-500">选项（每行一个）</div>
        <Textarea v-model:value="editForm.options" :rows="4" />
      </div>
      <div class="mb-3">
        <div class="mb-1 text-gray-500">答案</div>
        <Input v-model:value="editForm.answer" />
      </div>
      <div>
        <div class="mb-1 text-gray-500">解析</div>
        <Textarea v-model:value="editForm.explanation" :rows="3" />
      </div>
    </Modal>
  </div>
</template>
