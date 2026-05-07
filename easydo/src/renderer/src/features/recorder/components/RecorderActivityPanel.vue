<script setup lang="ts">
import type { RecorderMetric } from "../types";

defineProps<{
  clickStreamActive: boolean;
  errorMessage: string;
  metrics: RecorderMetric[];
  narrative: string;
}>();
</script>

<template>
  <section class="panel app-panel">
    <div class="panel__header">
      <div>
        <span class="app-eyebrow">Activity Feed</span>
        <h2>{{ clickStreamActive ? "Click stream is live" : "Recorder activity summary" }}</h2>
      </div>
      <span class="app-chip" :class="clickStreamActive ? 'app-chip--accent' : 'app-chip--neutral'">
        {{ clickStreamActive ? "Watching clicks" : "Standby" }}
      </span>
    </div>

    <p class="panel__narrative">{{ narrative }}</p>

    <div class="metrics">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span class="metric-card__label">{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <span class="metric-card__hint">{{ metric.hint }}</span>
      </article>
    </div>

    <div class="panel__message" :class="{ 'panel__message--danger': errorMessage }">
      {{ errorMessage || "No recorder warnings right now." }}
    </div>
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

.panel__narrative {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.75;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border-soft);
}

.metric-card__label,
.metric-card__hint {
  color: var(--color-text-faint);
}

.metric-card strong {
  font-size: 1.2rem;
  line-height: 1;
}

.panel__message {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
  line-height: 1.6;
}

.panel__message--danger {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

@media (max-width: 960px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .metrics {
    grid-template-columns: 1fr;
  }
}
</style>
