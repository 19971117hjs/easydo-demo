<script setup lang="ts">
defineProps<{
  actionPending: boolean;
  canCaptureNow: boolean;
  canPauseSession: boolean;
  canStartClickStream: boolean;
  canStartSession: boolean;
  canStopSession: boolean;
  clickStreamActive: boolean;
  notes: string;
  title: string;
}>();

const emit = defineEmits<{
  "update:title": [value: string];
  "update:notes": [value: string];
  "start-recording": [];
  "pause-recording": [];
  "stop-recording": [];
  "capture-screen": [];
  "select-area": [];
  "refresh-permissions": [];
  "start-click-stream": [];
  "stop-click-stream": [];
}>();
</script>

<template>
  <section class="panel app-panel">
    <div class="panel__header">
      <div>
        <span class="app-eyebrow">Capture Controls</span>
        <h2>Keep only the real recorder actions in front of the operator.</h2>
      </div>
      <button
        class="app-button app-button--ghost"
        type="button"
        :disabled="actionPending"
        @click="emit('refresh-permissions')"
      >
        Refresh Permissions
      </button>
    </div>

    <div class="panel__actions">
      <button
        class="app-button app-button--primary"
        type="button"
        :disabled="actionPending || !canStartSession"
        @click="emit('start-recording')"
      >
        Start Recorder
      </button>
      <button
        class="app-button app-button--secondary"
        type="button"
        :disabled="actionPending || !canCaptureNow"
        @click="emit('capture-screen')"
      >
        Capture Screen
      </button>
      <button
        class="app-button app-button--secondary"
        type="button"
        :disabled="actionPending || !canCaptureNow"
        @click="emit('select-area')"
      >
        Select Area
      </button>
    </div>

    <div class="panel__subactions">
      <button
        class="app-button"
        :class="clickStreamActive ? 'app-button--danger' : 'app-button--signal'"
        type="button"
        :disabled="actionPending || (!clickStreamActive && !canStartClickStream)"
        @click="clickStreamActive ? emit('stop-click-stream') : emit('start-click-stream')"
      >
        {{ clickStreamActive ? "Stop Click Stream" : "Start Click Stream" }}
      </button>
      <button
        class="app-button app-button--ghost"
        type="button"
        :disabled="actionPending || !canPauseSession"
        @click="emit('pause-recording')"
      >
        Pause
      </button>
      <button
        class="app-button app-button--ghost"
        type="button"
        :disabled="actionPending || !canStopSession"
        @click="emit('stop-recording')"
      >
        Stop
      </button>
    </div>

    <div class="panel__fields">
      <label class="app-field">
        <span>Suggested Step Title</span>
        <input
          class="app-input"
          :value="title"
          placeholder="Example: Open dashboard filters"
          @input="emit('update:title', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="app-field">
        <span>Operator Note</span>
        <textarea
          class="app-textarea"
          :value="notes"
          rows="5"
          placeholder="Describe what the operator should verify after the screenshot is taken."
          @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
        />
      </label>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: var(--space-5);
  padding: 20px;
}

.panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
}

.panel__header h2 {
  margin: 8px 0 0;
  font-size: 1.05rem;
  line-height: 1.3;
}

.panel__actions,
.panel__subactions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.panel__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

@media (max-width: 860px) {
  .panel__header,
  .panel__fields {
    grid-template-columns: 1fr;
    display: grid;
  }
}
</style>
