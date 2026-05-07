<script setup lang="ts">
import CaptureStudioPanel from "@renderer/components/capture/CaptureStudioPanel.vue";
</script>

<template>
  <section class="capture-controls-view">
    <CaptureStudioPanel />
  </section>
</template>

<style scoped>
.capture-controls-view {
  width: 100vw;
  height: 100vh;
  padding: 8px;
  box-sizing: border-box;
  background: transparent;
}
</style>
