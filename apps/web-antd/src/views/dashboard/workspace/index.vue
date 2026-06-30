<script lang="ts" setup>
import { useUserStore } from '@vben/stores';

const userStore = useUserStore();
</script>

<template>
  <div class="p-5">
    <div class="rounded-lg bg-background p-8 text-center shadow-sm">
      <h1 class="mb-2 text-2xl font-semibold">
        欢迎回来，{{ userStore.userInfo?.realName || '管理员' }}
      </h1>
      <p class="text-muted-foreground"> 工作台功能即将上线，敬请期待。 </p>
    </div>
  </div>
</template>
