<script lang="ts" setup>
import { ref } from 'vue';

import {
  Button,
  Card,
  Descriptions,
  Progress,
  Space,
  Tag,
  Timeline,
  Upload,
  message,
} from 'ant-design-vue';

import {
  getUploadTaskApi,
  uploadSamplesApi,
  type UploadTask,
} from '#/api';

const uploading = ref(false);
const task = ref<UploadTask | null>(null);
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);

async function handleUpload(file: File) {
  if (!file.name.endsWith('.jsonl')) {
    message.error('只接受 .jsonl 文件');
    return false;
  }

  uploading.value = true;
  try {
    const { task_id } = await uploadSamplesApi(file);
    message.success('上传任务已创建');
    startPolling(task_id);
  } catch {
    message.error('上传失败');
  } finally {
    uploading.value = false;
  }
  return false;
}

function startPolling(taskId: string) {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
  }
  task.value = null;
  pollTimer.value = setInterval(async () => {
    try {
      const data = await getUploadTaskApi(taskId);
      task.value = data;
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollTimer.value) {
          clearInterval(pollTimer.value);
          pollTimer.value = null;
        }
      }
    } catch {
      // ignore polling errors
    }
  }, 1500);
}

function statusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'running':
      return 'blue';
    default:
      return 'default';
  }
}

function statusText(status: string) {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    case 'running':
      return '处理中';
    default:
      return '等待中';
  }
}
</script>

<template>
  <div class="p-5">
    <Card title="批量上传题库样本">
      <Space direction="vertical" size="large" style="width: 100%">
        <Upload :before-upload="handleUpload" :disabled="uploading" accept=".jsonl">
          <Button :loading="uploading" type="primary">选择 JSONL 文件</Button>
        </Upload>

        <div class="text-gray-500 text-sm">
          每行一个 JSON 对象，必需字段：question_text、question_type、response_mode、target_level、skill_dimension。
          客观题（单选/多选/判断）还需 options 与 correct_answer。
        </div>

        <template v-if="task">
          <Card class="mt-4" size="small" title="任务状态">
            <Descriptions :column="2" bordered size="small">
              <Descriptions.Item label="任务 ID">{{ task.task_id }}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag :color="statusColor(task.status)">{{ statusText(task.status) }}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="总数">{{ task.total }}</Descriptions.Item>
              <Descriptions.Item label="成功">{{ task.processed }}</Descriptions.Item>
              <Descriptions.Item label="失败">{{ task.failed_count }}</Descriptions.Item>
            </Descriptions>

            <Progress
              v-if="task.total > 0"
              :percent="Math.round((task.processed + task.failed_count) / task.total * 100)"
              class="mt-4"
              status="active"
            />

            <Timeline v-if="task.errors && task.errors.length" class="mt-4">
              <Timeline.Item
                v-for="err in task.errors.slice(-5)"
                :key="err.line"
                color="red"
              >
                第 {{ err.line }} 行：{{ err.reason }}
              </Timeline.Item>
            </Timeline>
          </Card>
        </template>
      </Space>
    </Card>
  </div>
</template>
