<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { CaptureStudioPayload, CaptureTargetMode, ClickStreamProgress } from "@shared/contracts";
import { getErrorMessage } from "@renderer/utils/error-message";

const props = withDefaults(
  defineProps<{
    embedded?: boolean;
  }>(),
  {
    embedded: false
  }
);

const studio = ref<CaptureStudioPayload | null>(null);
const progress = ref<ClickStreamProgress>({
  acceptedCount: 0,
  queuedCount: 0,
  completedCount: 0,
  lastEventAt: null
});
const errorMessage = ref("");
const latestTitle = ref("");
const latestNotes = ref("");
const savingLatestStep = ref(false);

let stopStudioChanged: (() => void) | null = null;
let stopClickProgress: (() => void) | null = null;
let persistTimer: number | null = null;

const phase = computed(() => studio.value?.phase ?? "setup");
const isSetup = computed(() => phase.value === "setup");
const isRecording = computed(() => phase.value === "recording");
const isPaused = computed(() => phase.value === "paused");
const latestStep = computed(() => studio.value?.latestStep ?? null);
const stepCount = computed(() => studio.value?.stepCount ?? 0);
const captureMode = computed(() => studio.value?.captureMode ?? "selected-region");
const cropperVisible = computed(() => studio.value?.cropperVisible ?? true);
const cropperButtonLabel = computed(() => (cropperVisible.value ? "Hide cropper" : "Show cropper"));

watch(
  latestStep,
  (value) => {
    latestTitle.value = value?.title ?? "";
    latestNotes.value = value?.notes ?? "";
  },
  { immediate: true }
);

watch([latestTitle, latestNotes], () => {
  if (!latestStep.value || props.embedded) {
    return;
  }

  if (persistTimer) {
    window.clearTimeout(persistTimer);
  }

  persistTimer = window.setTimeout(() => {
    void persistLatestStep();
  }, 220);
});

async function syncStudio(): Promise<void> {
  studio.value = await window.easydo.capture.getStudioPayload();
}

async function setCaptureMode(mode: CaptureTargetMode): Promise<void> {
  errorMessage.value = "";
  try {
    studio.value = await window.easydo.capture.setStudioCaptureMode(mode);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function startCapture(): Promise<void> {
  errorMessage.value = "";
  try {
    await window.easydo.capture.startStudioCapture();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function pauseCapture(): Promise<void> {
  errorMessage.value = "";
  try {
    await window.easydo.capture.pauseStudioCapture();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function resumeCapture(): Promise<void> {
  errorMessage.value = "";
  try {
    await window.easydo.capture.resumeStudioCapture();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function finishCapture(): Promise<void> {
  errorMessage.value = "";
  try {
    await window.easydo.capture.finishStudioCapture();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function cancelCapture(): Promise<void> {
  errorMessage.value = "";
  try {
    await window.easydo.capture.cancelOverlaySelection();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function toggleCropperVisibility(): Promise<void> {
  errorMessage.value = "";
  try {
    studio.value = await window.easydo.capture.setStudioCropperVisible(!cropperVisible.value);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function deleteLatestStep(): Promise<void> {
  errorMessage.value = "";
  try {
    studio.value = await window.easydo.capture.deleteStudioLatestStep();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function persistLatestStep(): Promise<void> {
  if (!latestStep.value) {
    return;
  }

  savingLatestStep.value = true;
  try {
    studio.value = await window.easydo.capture.updateStudioLatestStep({
      title: latestTitle.value,
      notes: latestNotes.value
    });
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    savingLatestStep.value = false;
  }
}

onMounted(async () => {
  await syncStudio();
  stopStudioChanged = window.easydo.capture.onStudioChanged((payload) => {
    studio.value = payload;
  });
  stopClickProgress = window.easydo.capture.onClickStreamProgress((payload) => {
    progress.value = payload;
  });
});

onUnmounted(() => {
  if (persistTimer) {
    window.clearTimeout(persistTimer);
  }
  stopStudioChanged?.();
  stopClickProgress?.();
});
</script>

<template>
  <section class="studio-panel" :class="{ 'studio-panel--embedded': embedded }">
    <header class="studio-panel__header">
      <div class="studio-panel__title-row studio-panel__drag-handle">
        <h1>{{ isPaused ? "Paused" : isRecording ? "Capturing" : "What to capture" }}</h1>
        <button class="studio-panel__help" type="button">?</button>
      </div>
      <div class="studio-panel__divider"></div>
      <p v-if="isRecording || isPaused" class="studio-panel__meta">Number of steps: {{ stepCount }}</p>
    </header>

    <section class="studio-panel__body">
      <template v-if="isSetup">
        <div class="studio-options">
          <label class="studio-option">
            <input
              type="radio"
              name="captureMode"
              :checked="captureMode === 'selected-region'"
              @change="setCaptureMode('selected-region')"
            />
            <span>Selected Region</span>
          </label>
          <label class="studio-option">
            <input
              type="radio"
              name="captureMode"
              :checked="captureMode === 'full-screen'"
              @change="setCaptureMode('full-screen')"
            />
            <span>Full Screen</span>
          </label>
          <label class="studio-option">
            <input
              type="radio"
              name="captureMode"
              :checked="captureMode === 'active-window'"
              @change="setCaptureMode('active-window')"
            />
            <span>Active Window</span>
          </label>
        </div>

        <div class="studio-actions">
          <button class="studio-button studio-button--primary" type="button" @click="startCapture">
            Start capturing
          </button>
          <button class="studio-button studio-button--ghost" type="button" @click="cancelCapture">
            Cancel
          </button>
        </div>

        <div class="studio-tools">
          <button class="studio-tool" type="button" @click="toggleCropperVisibility">
            {{ cropperButtonLabel }}
          </button>
        </div>
      </template>

      <template v-else-if="isPaused">
        <div class="studio-actions studio-actions--stacked">
          <button class="studio-button studio-button--blue" type="button" @click="resumeCapture">
            Resume
          </button>
          <button class="studio-button studio-button--green" type="button" @click="finishCapture">
            Finish
          </button>
        </div>

        <div class="studio-options studio-options--spaced">
          <h2>What to capture</h2>
          <label class="studio-option">
            <input
              type="radio"
              name="captureModePaused"
              :checked="captureMode === 'selected-region'"
              @change="setCaptureMode('selected-region')"
            />
            <span>Selected Region</span>
          </label>
          <label class="studio-option">
            <input
              type="radio"
              name="captureModePaused"
              :checked="captureMode === 'full-screen'"
              @change="setCaptureMode('full-screen')"
            />
            <span>Full Screen</span>
          </label>
          <label class="studio-option">
            <input
              type="radio"
              name="captureModePaused"
              :checked="captureMode === 'active-window'"
              @change="setCaptureMode('active-window')"
            />
            <span>Active Window</span>
          </label>
        </div>

        <div class="studio-tools">
          <button class="studio-tool" type="button" @click="toggleCropperVisibility">
            {{ cropperButtonLabel }}
          </button>
        </div>
      </template>

      <template v-else>
        <section v-if="latestStep" class="latest-step">
          <div class="latest-step__header">
            <h2>Latest step details</h2>
            <span v-if="savingLatestStep">Saving…</span>
          </div>

          <div class="latest-step__preview">
            <img :src="latestStep.assetAppUrl" :alt="latestStep.title" />
            <button class="latest-step__delete" type="button" @click="deleteLatestStep">Delete step</button>
          </div>

          <input
            v-model="latestTitle"
            class="latest-step__input"
            type="text"
            placeholder="Step Title"
          />
          <textarea
            v-model="latestNotes"
            class="latest-step__input latest-step__input--notes"
            rows="3"
            placeholder="Step Description"
          ></textarea>
        </section>

        <div class="studio-actions studio-actions--stacked">
          <button class="studio-button studio-button--blue" type="button" @click="pauseCapture">
            Pause
          </button>
          <button class="studio-button studio-button--green" type="button" @click="finishCapture">
            Finish
          </button>
        </div>

        <div class="studio-tools">
          <button class="studio-tool" type="button" @click="toggleCropperVisibility">
            {{ cropperButtonLabel }}
          </button>
        </div>
      </template>

      <p v-if="errorMessage" class="studio-panel__error">{{ errorMessage }}</p>
    </section>
  </section>
</template>

<style scoped>
.studio-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-height: 100%;
  padding: 16px 16px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(93, 99, 110, 0.18);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.18);
  color: #1f2329;
  overflow: hidden;
}

.studio-panel--embedded {
  width: 286px;
  min-height: auto;
}

.studio-panel__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.studio-panel__title-row h1 {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.1;
  font-weight: 500;
}

.studio-panel__help {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: #5aa4ff;
  color: #ffffff;
  font-size: 1rem;
  cursor: pointer;
}

.studio-panel__divider {
  height: 1px;
  background: rgba(31, 35, 41, 0.14);
}

.studio-panel__meta {
  margin: 0;
  color: rgba(31, 35, 41, 0.72);
  font-size: 0.92rem;
}

.studio-panel__body {
  display: grid;
  gap: 14px;
  align-content: start;
}

.studio-options {
  display: grid;
  gap: 8px;
}

.studio-options--spaced {
  margin-top: 2px;
}

.studio-options h2,
.latest-step h2 {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 600;
}

.studio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.98rem;
}

.studio-actions {
  display: flex;
  gap: 8px;
}

.studio-actions--stacked .studio-button {
  flex: 1;
}

.studio-button {
  min-height: 36px;
  border-radius: 5px;
  border: 1px solid rgba(31, 35, 41, 0.18);
  background: #ffffff;
  color: #1f2329;
  font: inherit;
  font-weight: 600;
  font-size: 0.96rem;
  cursor: pointer;
}

.studio-button--primary {
  background: #30b04a;
  border-color: #23933a;
  color: #ffffff;
}

.studio-button--blue {
  background: #4c95ff;
  border-color: #367fe8;
  color: #ffffff;
}

.studio-button--green {
  background: #4caf50;
  border-color: #3f9743;
  color: #ffffff;
}

.studio-button--ghost {
  background: #f4f5f7;
}

.studio-tools {
  display: flex;
  justify-content: center;
}

.studio-tool {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(31, 35, 41, 0.18);
  border-radius: 5px;
  background: #ffffff;
  color: rgba(31, 35, 41, 0.78);
  font: inherit;
  font-size: 0.84rem;
  cursor: pointer;
}

.latest-step {
  display: grid;
  gap: 10px;
}

.latest-step__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.latest-step__header span {
  color: rgba(31, 35, 41, 0.6);
  font-size: 0.82rem;
}

.latest-step__preview {
  display: grid;
  gap: 6px;
}

.latest-step__preview img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid rgba(31, 35, 41, 0.12);
  background: #edf0f4;
}

.latest-step__delete {
  justify-self: end;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(142, 46, 46, 0.18);
  border-radius: 5px;
  background: rgba(142, 46, 46, 0.06);
  color: #8e2e2e;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.latest-step__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(31, 35, 41, 0.16);
  border-radius: 4px;
  padding: 8px 10px;
  font: inherit;
  font-size: 0.9rem;
}

.latest-step__input--notes {
  resize: none;
  min-height: 76px;
}

.studio-panel__error {
  margin: 0;
  color: #a73030;
  font-size: 0.84rem;
  line-height: 1.5;
}
</style>
