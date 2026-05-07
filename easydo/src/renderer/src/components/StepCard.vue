<script setup lang="ts">
import type { StepDraft } from "@shared/contracts";
import RichTextEditor from "@renderer/components/RichTextEditor.vue";
import { resolveAssetUrl } from "@renderer/utils/asset-url";

const props = defineProps<{
  step: StepDraft;
}>();

const emit = defineEmits<{
  change: [patch: Partial<StepDraft>];
  duplicate: [];
  remove: [];
}>();
</script>

<template>
  <article class="step-card">
    <div class="step-card__meta">
      <div class="step-card__badges">
        <span class="step-card__badge step-card__badge--primary">
          Step {{ String(props.step.stepNumber ?? "?").padStart(2, "0") }}
        </span>
        <span v-if="props.step.clickIndex" class="step-card__badge">
          Click {{ String(props.step.clickIndex).padStart(2, "0") }}
        </span>
        <span class="step-card__kind">{{ props.step.kind }}</span>
      </div>
      <div class="step-card__actions">
        <button type="button" @click="emit('duplicate')">Duplicate</button>
        <button type="button" class="step-card__danger" @click="emit('remove')">Delete</button>
      </div>
    </div>

    <div class="step-card__toolbar">
      <label>
        <span>Step type</span>
        <select
          :value="props.step.kind"
          @change="emit('change', { kind: ($event.target as HTMLSelectElement).value as StepDraft['kind'] })"
        >
          <option value="action">Action</option>
          <option value="note">Note</option>
          <option value="section">Section</option>
        </select>
      </label>
    </div>

    <div v-if="props.step.contextLabel || props.step.appName || props.step.windowTitle" class="step-card__context">
      <strong>{{ props.step.contextLabel || props.step.appName || "Captured context" }}</strong>
      <span v-if="props.step.windowTitle && props.step.windowTitle !== props.step.contextLabel">
        {{ props.step.windowTitle }}
      </span>
      <span v-if="props.step.appName && props.step.appName !== props.step.contextLabel">
        {{ props.step.appName }}
      </span>
    </div>

    <input
      class="step-card__title"
      :value="props.step.title"
      @input="emit('change', { title: ($event.target as HTMLInputElement).value })"
    />

    <RichTextEditor
      :model-value="props.step.notesHtml ?? ''"
      placeholder="Add the exact operator instructions, validation rules, warnings, and expected result."
      @update:model-value="emit('change', { notesHtml: $event })"
    />

    <div v-if="props.step.asset" class="step-card__asset">
      <img :src="resolveAssetUrl(props.step.asset)" :alt="props.step.title" />
      <div class="step-card__asset-meta">
        <strong>{{ props.step.asset.displayLabel }}</strong>
        <span>{{ props.step.asset.width }} × {{ props.step.asset.height }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.step-card {
  display: grid;
  gap: 14px;
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(32, 43, 56, 0.1);
  box-shadow: 0 18px 50px rgba(32, 43, 56, 0.08);
}

.step-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  color: #5e6a74;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.step-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.step-card__badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 10px;
  background: rgba(31, 44, 55, 0.08);
  color: #42515c;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.step-card__badge--primary {
  background: rgba(24, 140, 104, 0.14);
  color: #15684e;
}

.step-card__kind {
  text-transform: capitalize;
}

.step-card__actions {
  display: flex;
  gap: 8px;
}

.step-card__actions button,
.step-card__toolbar select {
  border: 1px solid rgba(32, 43, 56, 0.12);
  border-radius: 999px;
  padding: 9px 12px;
  background: rgba(255, 255, 255, 0.82);
  color: #31404b;
  cursor: pointer;
}

.step-card__danger {
  color: #a14a42;
}

.step-card__toolbar {
  display: flex;
  justify-content: flex-end;
}

.step-card__toolbar label {
  display: grid;
  gap: 6px;
  color: #5e6a74;
  font-size: 0.84rem;
}

.step-card__context {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #5e6a74;
  font-size: 0.92rem;
}

.step-card__context strong {
  color: #1f2c37;
}

.step-card__title {
  width: 100%;
  border: none;
  background: #f7f1e6;
  border-radius: 16px;
  padding: 14px 16px;
  font: inherit;
  color: #1f2c37;
  font-size: 1.05rem;
  font-weight: 700;
}

.step-card__asset {
  display: grid;
  gap: 10px;
}

.step-card__asset img {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(31, 44, 55, 0.08);
  background: #fff;
}

.step-card__asset-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: #5e6a74;
  font-size: 0.84rem;
}
</style>
