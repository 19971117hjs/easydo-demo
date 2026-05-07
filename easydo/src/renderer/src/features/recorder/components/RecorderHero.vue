<script setup lang="ts">
import type { RecorderBadge } from "../types";

defineProps<{
  badges: RecorderBadge[];
  guideName: string;
  guideMeta: string;
  summary: string;
  appVersion: string;
}>();
</script>

<template>
  <section class="hero app-panel app-panel--raised">
    <div class="hero__copy">
      <span class="app-eyebrow">Recorder Parity Pass</span>
      <h1>Keep Recorder focused on one capture lane at a time.</h1>
      <p>{{ summary }}</p>
    </div>

    <div class="hero__sidebar">
      <div class="hero__guide">
        <span class="hero__label">Current Guide</span>
        <strong>{{ guideName }}</strong>
        <span class="hero__meta">{{ guideMeta }}</span>
      </div>

      <div class="hero__badges">
        <div
          v-for="badge in badges"
          :key="badge.label"
          class="app-chip"
          :class="`app-chip--${badge.tone}`"
        >
          <span class="app-chip__label">{{ badge.label }}</span>
          <span>{{ badge.value }}</span>
        </div>
      </div>

      <span class="hero__version">{{ appVersion }}</span>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: var(--space-6);
  padding: 20px 22px;
}

.hero__copy h1 {
  margin: 8px 0 10px;
  font-size: clamp(1.7rem, 2.2vw, 2.5rem);
  line-height: 1.02;
}

.hero__copy p {
  margin: 0;
  max-width: 58ch;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.hero__sidebar {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.hero__guide {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border-soft);
}

.hero__label,
.hero__meta,
.hero__version {
  color: var(--color-text-faint);
}

.hero__guide strong {
  font-size: 1.05rem;
}

.hero__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero__version {
  font-size: 0.88rem;
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
  }
}
</style>
