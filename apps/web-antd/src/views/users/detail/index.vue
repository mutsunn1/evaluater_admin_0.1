<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  Descriptions,
  List,
  Tag,
} from 'ant-design-vue';

import { getUserDetailApi } from '#/api';
import type { UserProfile } from '#/api';

const route = useRoute();
const router = useRouter();
const profile = ref<UserProfile | null>(null);
const loading = ref(false);

const userId = computed(() => decodeURIComponent(String(route.params.user_id)));

const skillLabels: Record<string, string> = {
  grammar: '语法',
  pragmatics: '语用',
  reading: '阅读',
  vocabulary: '词汇',
};

const skillItems = computed(() => {
  if (!profile.value) return [];
  return Object.entries(profile.value.skill_levels || {}).map(([key, value]) => ({
    label: skillLabels[key] || key,
    value,
  }));
});

async function fetchDetail() {
  loading.value = true;
  try {
    profile.value = await getUserDetailApi(userId.value);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push('/users/list');
}

onMounted(fetchDetail);
</script>

<template>
  <div v-if="profile" class="p-5">
    <Button class="mb-4" @click="goBack">返回</Button>

    <Card :loading="loading" title="用户画像">
      <Descriptions bordered :column="2">
        <Descriptions.Item label="用户 ID">{{ profile.user_id }}</Descriptions.Item>
        <Descriptions.Item label="HSK 等级">
          <Tag color="blue">HSK {{ profile.hsk_level }}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="母语">{{ profile.native_language }}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{{ profile.created_at }}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{{ profile.updated_at }}</Descriptions.Item>
      </Descriptions>
    </Card>

    <Card class="mt-4" title="技能等级">
      <Descriptions bordered :column="2">
        <Descriptions.Item
          v-for="item in skillItems"
          :key="item.label"
          :label="item.label"
        >
          {{ item.value }}
        </Descriptions.Item>
      </Descriptions>
    </Card>

    <Card class="mt-4" title="评测记录">
      <Button type="primary" @click="router.push(`/users/${encodeURIComponent(profile.user_id)}/sessions`)"
        >查看记录</Button
      >
    </Card>

    <Card class="mt-4" title="耗时统计">
      <Button type="primary" @click="router.push(`/users/${encodeURIComponent(profile.user_id)}/timing`)"
        >查看统计</Button
      >
    </Card>

    <Card class="mt-4" title="顽固错误">
      <List
        v-if="profile.stubborn_errors?.length"
        :data-source="profile.stubborn_errors"
        bordered
      >
        <template #renderItem="{ item }">
          <List.Item>{{ item }}</List.Item>
        </template>
      </List>
      <span v-else class="text-gray-400">暂无</span>
    </Card>

    <Card class="mt-4" title="优势">
      <List v-if="profile.strengths?.length" :data-source="profile.strengths" bordered>
        <template #renderItem="{ item }">
          <List.Item>{{ item }}</List.Item>
        </template>
      </List>
      <span v-else class="text-gray-400">暂无</span>
    </Card>

    <Card class="mt-4" title="下一阶段重点">
      <List
        v-if="profile.next_focus?.length"
        :data-source="profile.next_focus"
        bordered
      >
        <template #renderItem="{ item }">
          <List.Item>{{ item }}</List.Item>
        </template>
      </List>
      <span v-else class="text-gray-400">暂无</span>
    </Card>
  </div>
</template>
