<script setup lang="ts">
import type { RecorderPermissionItem } from "../types";

defineProps<{
  checkedAt: string;
  items: RecorderPermissionItem[];
  notes: string[];
}>();
</script>

<template>
  <section class="panel app-panel">
    <div class="panel__header">
      <div>
        <span class="app-eyebrow">Permission Readiness</span>
        <h2>Make macOS blockers obvious before the user starts recording.</h2>
      </div>
      <span class="panel__checked">Checked {{ checkedAt }}</span>
    </div>

    <div class="panel__list">
      <article
        v-for="item in items"
        :key="item.id"
        class="permission-card"
      >
        <div class="permission-card__top">
          <strong>{{ item.label }}</strong>
          <span class="app-chip" :class="`app-chip--${item.tone}`">{{ item.value }}</span>
        </div>
        <p>{{ item.summary }}</p>
      </article>
    </div>

    <ul v-if="notes.length" class="panel__notes">
      <li v-for="note in notes" :key="note">{{ note }}</li>
    </ul>
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
  gap: 12px;
}

.panel__header h2 {
  margin: 8px 0 0;
  font-size: 1.05rem;
  line-height: 1.28;
}

.panel__checked,
.panel__notes {
  color: var(--color-text-faint);
}

.panel__list {
  display: grid;
  gap: 12px;
}

.permission-card {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border-soft);
}

.permission-card__top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.permission-card p {
  margin: 12px 0 0;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.panel__notes {
  margin: 0;
  padding-left: 18px;
  line-height: 1.7;
}
</style>
