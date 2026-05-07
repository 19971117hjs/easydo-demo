<script setup lang="ts">
import { computed, onMounted, watchEffect } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppShell from "@renderer/components/AppShell.vue";
import { useWorkbenchStore } from "@renderer/stores/workbench";

const workbench = useWorkbenchStore();
const route = useRoute();
const layout = computed(() => (route.meta.layout === "overlay" ? "overlay" : route.meta.layout === "shell" ? "shell" : "plain"));
const shouldRenderShell = computed(() => layout.value === "shell");

onMounted(() => {
  if (shouldRenderShell.value) {
    void workbench.bootstrap();
  }
});

watchEffect(() => {
  document.documentElement.dataset.easydoLayout = layout.value;
  document.body.dataset.easydoLayout = layout.value;
});
</script>

<template>
  <RouterView v-if="layout === 'overlay' || layout === 'plain'" />
  <AppShell v-else>
    <RouterView />
  </AppShell>
</template>
