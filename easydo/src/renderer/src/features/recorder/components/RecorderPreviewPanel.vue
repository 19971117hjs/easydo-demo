<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { RecorderPreviewSummary } from "../types";

defineProps<{
  preview: RecorderPreviewSummary | null;
}>();
</script>

<template>
  <section class="panel app-panel app-panel--raised">
    <div class="panel__header">
      <div>
        <span class="app-eyebrow">Latest Capture</span>
        <h2>Show the newest screenshot where the user expects instant confirmation.</h2>
      </div>
      <RouterLink class="app-button app-button--ghost" to="/editor">Open Editor</RouterLink>
    </div>

    <template v-if="preview">
      <div class="preview">
        <img class="preview__image" :src="preview.imageUrl" :alt="preview.title" />
        <div class="preview__body">
          <div class="preview__chips">
            <span v-for="badge in preview.badges" :key="badge" class="app-chip">{{ badge }}</span>
          </div>
          <strong class="preview__title">{{ preview.title }}</strong>
          <ul class="preview__details">
            <li v-for="detail in preview.details" :key="detail">{{ detail }}</li>
          </ul>
          <p class="preview__path">{{ preview.absolutePath }}</p>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="empty-state">
        <strong>No polished capture yet</strong>
        <p>Use simple screenshot or area selection first. The next successful capture will become the reference artifact for the Recorder flow.</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: var(--space-4);
  padding: 20px;
}

.panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.panel__header h2 {
  margin: 8px 0 0;
  font-size: 1.05rem;
  line-height: 1.28;
}

.preview {
  display: grid;
  gap: 18px;
}

.preview__image {
  width: 100%;
  border-radius: 14px;
  border: 1px solid var(--color-border-soft);
  background: #d7d1c5;
  box-shadow: var(--shadow-soft);
}

.preview__body {
  display: grid;
  gap: 14px;
}

.preview__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preview__title {
  font-size: 1.25rem;
}

.preview__details {
  margin: 0;
  padding-left: 18px;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.preview__path {
  margin: 0;
  color: var(--color-text-faint);
  word-break: break-all;
}

.empty-state {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
  border: 1px dashed var(--color-border-strong);
}

.empty-state p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.7;
}
</style>
