<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { CaptureOverlayPayload, CaptureStudioPayload, CaptureTargetMode, SelectionRect } from "@shared/contracts";
import CaptureStudioPanel from "@renderer/components/capture/CaptureStudioPanel.vue";
import { getErrorMessage } from "@renderer/utils/error-message";

type ResizeDirection = "n" | "e" | "s" | "w" | "nw" | "ne" | "se" | "sw";
type InteractionState =
  | { mode: "creating"; startX: number; startY: number }
  | { mode: "moving"; startX: number; startY: number; origin: SelectionRect }
  | {
      mode: "resizing";
      direction: ResizeDirection;
      startX: number;
      startY: number;
      origin: SelectionRect;
    };

const overlay = ref<CaptureOverlayPayload | null>(null);
const studio = ref<CaptureStudioPayload | null>(null);
const errorMessage = ref("");
const selection = ref<SelectionRect | null>(null);
const isSubmitting = ref(false);
const interaction = ref<InteractionState | null>(null);
const studioPanelPosition = ref<{ x: number; y: number } | null>(null);
const panelDrag = ref<{
  startX: number;
  startY: number;
  originX: number;
  originY: number;
} | null>(null);

const resizeHandles: ResizeDirection[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

let stopStudioChanged: (() => void) | null = null;
const finishSelectionListener = () => {
  void finishSelection();
};

const isAreaSelection = computed(() => overlay.value?.mode === "area-selection");
const isClickStreamHandoff = computed(() => overlay.value?.mode === "click-stream-handoff");
const isClickStreamStudio = computed(() => overlay.value?.mode === "click-stream-studio");
const isStudioRecording = computed(() => studio.value?.phase === "recording");
const isStudioHiddenForCapture = computed(() => studio.value?.hideDuringCapture ?? false);
const hasBackdropImage = computed(() => !!overlay.value?.imageDataUrl && isAreaSelection.value);
const studioMode = computed<CaptureTargetMode | null>(() => studio.value?.captureMode ?? null);
const studioCropperVisible = computed(() => studio.value?.cropperVisible ?? true);
const hasSelection = computed(
  () => !!selection.value && selection.value.width > 8 && selection.value.height > 8
);
const studioSupportsSelectionEditing = computed(
  () =>
    isClickStreamStudio.value &&
    studio.value?.captureMode === "selected-region" &&
    studio.value.phase !== "recording"
);
const studioHighlight = computed(() => {
  if (!studio.value) {
    return null;
  }

  if (studio.value.captureMode === "selected-region") {
    return selection.value;
  }

  if (studio.value.captureMode === "active-window") {
    return studio.value.activeWindowBounds;
  }

  return {
    x: 0,
    y: 0,
    width: studio.value.displayBounds.width,
    height: studio.value.displayBounds.height
  };
});
const studioMeasurementLabel = computed(() => {
  if (!studioHighlight.value || !studio.value) {
    return "";
  }

  if (studio.value.captureMode === "selected-region") {
    return `[${Math.round(studioHighlight.value.width)} x ${Math.round(studioHighlight.value.height)} px] Selected area below will be captured`;
  }

  if (studio.value.captureMode === "active-window") {
    return studio.value.activeWindowLabel || "The active window will be captured";
  }

  return "The full screen will be captured";
});
const studioPanelWidth = computed(() => {
  if (studio.value?.phase === "recording" && studio.value.latestStep) {
    return 476;
  }

  return 286;
});
const studioPanelStyle = computed(() => {
  const bounds = studio.value?.displayBounds ?? overlay.value?.displayBounds;
  const defaultX = bounds ? Math.max(24, bounds.width - studioPanelWidth.value - 80) : 80;
  const defaultY = bounds ? Math.max(72, Math.round(bounds.height * 0.2)) : 96;
  const position = studioPanelPosition.value ?? { x: defaultX, y: defaultY };

  return {
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${studioPanelWidth.value}px`
  };
});
function toPlainRect(rect: SelectionRect): SelectionRect {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  };
}

function getPoint(event: PointerEvent): { x: number; y: number } {
  const width = overlay.value?.displayBounds.width ?? studio.value?.displayBounds.width ?? event.clientX;
  const height = overlay.value?.displayBounds.height ?? studio.value?.displayBounds.height ?? event.clientY;
  const x = Math.max(0, Math.min(event.clientX, width));
  const y = Math.max(0, Math.min(event.clientY, height));
  return { x, y };
}

function clampRect(rect: SelectionRect, bounds: { width: number; height: number }): SelectionRect {
  const width = Math.max(0, Math.min(rect.width, bounds.width));
  const height = Math.max(0, Math.min(rect.height, bounds.height));
  const x = Math.max(0, Math.min(rect.x, bounds.width - width));
  const y = Math.max(0, Math.min(rect.y, bounds.height - height));
  return { x, y, width, height };
}

function normalizeRect(rect: SelectionRect): SelectionRect {
  const normalized: SelectionRect = { ...rect };
  if (normalized.width < 0) {
    normalized.x += normalized.width;
    normalized.width = Math.abs(normalized.width);
  }
  if (normalized.height < 0) {
    normalized.y += normalized.height;
    normalized.height = Math.abs(normalized.height);
  }
  return normalized;
}

function resizeRect(
  origin: SelectionRect,
  direction: ResizeDirection,
  deltaX: number,
  deltaY: number
): SelectionRect {
  let { x, y, width, height } = origin;

  if (direction.includes("e")) {
    width += deltaX;
  }
  if (direction.includes("s")) {
    height += deltaY;
  }
  if (direction.includes("w")) {
    x += deltaX;
    width -= deltaX;
  }
  if (direction.includes("n")) {
    y += deltaY;
    height -= deltaY;
  }

  return { x, y, width, height };
}

function clampStudioPanelPosition(position: { x: number; y: number }): { x: number; y: number } {
  const bounds = studio.value?.displayBounds ?? overlay.value?.displayBounds;
  if (!bounds) {
    return position;
  }

  const maxX = Math.max(24, bounds.width - 24 - studioPanelWidth.value);
  const maxY = Math.max(24, bounds.height - 24 - 360);
  return {
    x: Math.max(24, Math.min(position.x, maxX)),
    y: Math.max(24, Math.min(position.y, maxY))
  };
}

function syncStudioPanelPosition(): void {
  if (!isClickStreamStudio.value) {
    return;
  }

  if (!studioPanelPosition.value) {
    studioPanelPosition.value = clampStudioPanelPosition(
      studioPanelPosition.value ?? {
        x:
          (studio.value?.displayBounds.width ?? overlay.value?.displayBounds.width ?? 366) -
          studioPanelWidth.value -
          80,
        y: Math.max(72, Math.round((studio.value?.displayBounds.height ?? overlay.value?.displayBounds.height ?? 480) * 0.2))
      }
    );
    return;
  }

  studioPanelPosition.value = clampStudioPanelPosition(studioPanelPosition.value);
}

function startSelection(event: PointerEvent): void {
  if (!overlay.value) {
    return;
  }

  if (
    (event.target as HTMLElement | null)?.closest(
      ".overlay__handoff, .overlay__selection, .overlay__studio-panel"
    )
  ) {
    return;
  }

  if (isAreaSelection.value) {
    const point = getPoint(event);
    interaction.value = {
      mode: "creating",
      startX: point.x,
      startY: point.y
    };
    selection.value = {
      x: point.x,
      y: point.y,
      width: 0,
      height: 0
    };
    return;
  }

  if (!studioSupportsSelectionEditing.value || !studio.value) {
    return;
  }

  const point = getPoint(event);
  interaction.value = {
    mode: "creating",
    startX: point.x,
    startY: point.y
  };
  selection.value = {
    x: point.x,
    y: point.y,
    width: 0,
    height: 0
  };
}

function updateSelection(event: PointerEvent): void {
  if (panelDrag.value) {
    studioPanelPosition.value = clampStudioPanelPosition({
      x: panelDrag.value.originX + (event.clientX - panelDrag.value.startX),
      y: panelDrag.value.originY + (event.clientY - panelDrag.value.startY)
    });
    return;
  }

  if (!interaction.value) {
    return;
  }

  const bounds = isAreaSelection.value
    ? overlay.value?.displayBounds
    : studio.value?.displayBounds;
  if (!bounds) {
    return;
  }

  const point = getPoint(event);
  const state = interaction.value;

  if (state.mode === "creating") {
    selection.value = normalizeRect({
      x: Math.min(state.startX, point.x),
      y: Math.min(state.startY, point.y),
      width: Math.abs(point.x - state.startX),
      height: Math.abs(point.y - state.startY)
    });
    return;
  }

  if (state.mode === "moving") {
    selection.value = clampRect(
      {
        x: state.origin.x + (point.x - state.startX),
        y: state.origin.y + (point.y - state.startY),
        width: state.origin.width,
        height: state.origin.height
      },
      bounds
    );
    return;
  }

  selection.value = clampRect(
    normalizeRect(resizeRect(state.origin, state.direction, point.x - state.startX, point.y - state.startY)),
    bounds
  );
}

async function finishSelection(): Promise<void> {
  panelDrag.value = null;
  interaction.value = null;

  if (studioSupportsSelectionEditing.value && selection.value) {
    try {
      await window.easydo.capture.setStudioSelectionRect(toPlainRect(selection.value));
    } catch (error) {
      errorMessage.value = getErrorMessage(error);
    }
  }
}

function startStudioPanelDrag(event: PointerEvent): void {
  if (!isClickStreamStudio.value || studio.value?.phase === "recording") {
    return;
  }

  const target = event.target as HTMLElement | null;
  if (!target?.closest(".studio-panel__drag-handle")) {
    return;
  }

  const currentPosition = studioPanelPosition.value ?? {
    x: parseFloat(studioPanelStyle.value.left),
    y: parseFloat(studioPanelStyle.value.top)
  };
  panelDrag.value = {
    startX: event.clientX,
    startY: event.clientY,
    originX: currentPosition.x,
    originY: currentPosition.y
  };
}

function startMove(event: PointerEvent): void {
  if (!selection.value) {
    return;
  }

  const point = getPoint(event);
  interaction.value = {
    mode: "moving",
    startX: point.x,
    startY: point.y,
    origin: toPlainRect(selection.value)
  };
}

function startResize(direction: ResizeDirection, event: PointerEvent): void {
  if (!selection.value) {
    return;
  }

  const point = getPoint(event);
  interaction.value = {
    mode: "resizing",
    direction,
    startX: point.x,
    startY: point.y,
    origin: toPlainRect(selection.value)
  };
}

async function confirmSelection(): Promise<void> {
  if (!selection.value || !hasSelection.value) {
    errorMessage.value = "Drag to select a visible region first.";
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    await window.easydo.capture.confirmOverlaySelection(toPlainRect(selection.value));
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}

async function continueClickStream(): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    await window.easydo.capture.continueOverlayClickStream();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}

async function cancelSelection(): Promise<void> {
  try {
    await window.easydo.capture.cancelOverlaySelection();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

function handleStudioPanelEnter(): void {
  if (studio.value?.phase !== "recording") {
    return;
  }

  window.easydo.capture.acceptOverlayMouse();
}

function handleStudioPanelLeave(): void {
  if (studio.value?.phase !== "recording") {
    return;
  }

  window.easydo.capture.ignoreOverlayMouse();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    void cancelSelection();
  }

  if (event.key !== "Enter") {
    return;
  }

  if (isClickStreamHandoff.value) {
    void continueClickStream();
    return;
  }

  if (isAreaSelection.value && hasSelection.value) {
    void confirmSelection();
  }
}

function syncFromPayload(payload: CaptureOverlayPayload | null, studioPayload: CaptureStudioPayload | null): void {
  overlay.value = payload;
  studio.value = studioPayload;

  if (studioPayload?.captureMode === "selected-region") {
    selection.value = studioPayload.selectedRegion ? { ...studioPayload.selectedRegion } : null;
  } else {
    selection.value = null;
  }

  syncStudioPanelPosition();
}

onMounted(async () => {
  const [overlayPayload, studioPayload] = await Promise.all([
    window.easydo.capture.getOverlayPayload(),
    window.easydo.capture.getStudioPayload()
  ]);
  syncFromPayload(overlayPayload, studioPayload);
  stopStudioChanged = window.easydo.capture.onStudioChanged((payload) => {
    void window.easydo.capture
      .getOverlayPayload()
      .then((overlayPayload) => {
        syncFromPayload(overlayPayload, payload);
      })
      .catch(() => {
        syncFromPayload(overlay.value, payload);
      });
  });
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("pointermove", updateSelection);
  window.addEventListener("pointerup", finishSelectionListener);
});

onUnmounted(() => {
  stopStudioChanged?.();
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("pointermove", updateSelection);
  window.removeEventListener("pointerup", finishSelectionListener);
});
</script>

<template>
  <section
    class="overlay"
    :class="{
      'overlay--handoff': isClickStreamHandoff,
      'overlay--shooting': isStudioHiddenForCapture
    }"
    @pointerdown="startSelection"
  >
    <template v-if="hasBackdropImage">
      <img
        v-if="overlay?.imageDataUrl"
        class="overlay__image"
        :src="overlay.imageDataUrl"
        :alt="overlay.displayLabel"
        draggable="false"
      />
    </template>

    <template v-if="isAreaSelection">
      <div v-if="!selection" class="overlay__mask" />
    </template>

    <template v-if="isClickStreamStudio && studioHighlight && studioCropperVisible">
      <div
        class="overlay__selection overlay__selection--studio"
        :class="{
          'overlay__selection--interactive': studioSupportsSelectionEditing,
          'overlay__selection--screen': studioMode === 'full-screen',
          'overlay__selection--recording': isStudioRecording
        }"
        @pointerdown.stop="studioSupportsSelectionEditing ? startMove($event) : undefined"
        :style="{
          left: `${studioHighlight.x}px`,
          top: `${studioHighlight.y}px`,
          width: `${studioHighlight.width}px`,
          height: `${studioHighlight.height}px`
        }"
      >
        <div
          v-if="studioMeasurementLabel && !isStudioRecording"
          class="overlay__capture-label"
        >
          {{ studioMeasurementLabel }}
        </div>
        <button
          v-if="studioSupportsSelectionEditing"
          v-for="handle in resizeHandles"
          :key="handle"
          class="overlay__handle"
          :class="`overlay__handle--${handle}`"
          @pointerdown.stop="startResize(handle, $event)"
        />
      </div>
    </template>

    <div v-if="selection && isAreaSelection" class="overlay__selection" @pointerdown.stop="startMove" :style="{
      left: `${selection.x}px`,
      top: `${selection.y}px`,
      width: `${selection.width}px`,
      height: `${selection.height}px`
    }">
      <button
        v-for="handle in resizeHandles"
        :key="handle"
        class="overlay__handle"
        :class="`overlay__handle--${handle}`"
        @pointerdown.stop="startResize(handle, $event)"
      />
    </div>

    <div
      v-if="isClickStreamHandoff"
      class="overlay__handoff"
      @click="continueClickStream"
      @pointerdown.stop
      @pointermove.stop
      @pointerup.stop
    >
      <span class="overlay__eyebrow">{{ overlay?.displayLabel }}</span>
      <h1>{{ overlay?.headline || "Click here to continue with capturing on this screen" }}</h1>
      <div class="overlay__handoff-actions">
        <button class="overlay__button overlay__button--primary" type="button" :disabled="isSubmitting" @click="continueClickStream">
          {{ overlay?.confirmLabel || "Continue Capture" }}
        </button>
      </div>
    </div>

    <div
      v-if="isClickStreamStudio"
      class="overlay__studio-panel"
      :style="studioPanelStyle"
      @pointerdown.stop="startStudioPanelDrag"
      @pointermove.stop
      @pointerup.stop
      @pointerenter="handleStudioPanelEnter"
      @pointerleave="handleStudioPanelLeave"
    >
      <CaptureStudioPanel embedded />
    </div>

    <div v-if="isAreaSelection" class="overlay__hud" @pointerdown.stop @pointermove.stop @pointerup.stop>
      <div class="overlay__copy">
        <strong>{{ overlay?.suggestedTitle || "Select a capture area" }}</strong>
        <span>{{ overlay?.displayLabel }}</span>
        <small>Drag to select an area. Press Enter to confirm or Esc to cancel.</small>
      </div>
      <div class="overlay__actions">
        <button class="overlay__button overlay__button--ghost" type="button" @click.stop="cancelSelection">
          Cancel
        </button>
        <button
          class="overlay__button overlay__button--primary"
          type="button"
          :disabled="!hasSelection || isSubmitting"
          @click.stop="confirmSelection"
        >
          Confirm Selection
        </button>
      </div>
    </div>

    <div v-if="selection && isAreaSelection" class="overlay__coords">
      {{ Math.round(selection.width) }} × {{ Math.round(selection.height) }}
    </div>

    <div v-if="errorMessage" class="overlay__error">{{ errorMessage }}</div>
  </section>
</template>

<style scoped>
.overlay {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
  user-select: none;
}

.overlay--handoff {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at center, rgba(255, 205, 79, 0.08), transparent 26%),
    rgba(0, 0, 0, 0.82);
}

.overlay--shooting {
  opacity: 0;
  pointer-events: none;
}

.overlay__image,
.overlay__mask,
.overlay__studio-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.overlay__image {
  object-fit: fill;
}

.overlay__mask,
.overlay__studio-shade {
  background: rgba(15, 17, 21, 0.38);
}

.overlay__selection {
  position: absolute;
  border: 1.5px dashed rgba(255, 255, 255, 0.78);
  box-shadow: 0 0 0 9999px rgba(15, 17, 21, 0.26);
  background: transparent;
  cursor: move;
}

.overlay__selection--studio {
  border-color: rgba(255, 255, 255, 0.62);
  box-shadow: 0 0 0 9999px rgba(15, 17, 21, 0.3);
}

.overlay__selection--recording {
  box-shadow: none;
  border-style: solid;
  border-color: rgba(255, 235, 171, 0.9);
}

.overlay__selection--screen {
  box-shadow: none;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.18);
  background: transparent;
}

.overlay__selection--interactive {
  cursor: move;
}

.overlay__capture-label {
  position: absolute;
  left: -1px;
  top: -34px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.82);
  color: #14161a;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
}

.overlay__handle {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid rgba(54, 59, 64, 0.8);
  border-radius: 999px;
  background: #ffffff;
  padding: 0;
}

.overlay__handle--nw {
  top: -7px;
  left: -7px;
  cursor: nwse-resize;
}

.overlay__handle--n {
  top: -7px;
  left: calc(50% - 6px);
  cursor: ns-resize;
}

.overlay__handle--ne {
  top: -7px;
  right: -7px;
  cursor: nesw-resize;
}

.overlay__handle--e {
  top: calc(50% - 6px);
  right: -7px;
  cursor: ew-resize;
}

.overlay__handle--se {
  right: -7px;
  bottom: -7px;
  cursor: nwse-resize;
}

.overlay__handle--s {
  bottom: -7px;
  left: calc(50% - 6px);
  cursor: ns-resize;
}

.overlay__handle--sw {
  left: -7px;
  bottom: -7px;
  cursor: nesw-resize;
}

.overlay__handle--w {
  top: calc(50% - 6px);
  left: -7px;
  cursor: ew-resize;
}

.overlay__handoff {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 520px;
  max-width: min(90vw, 980px);
  padding: 24px 28px;
  border-radius: 10px;
  background: #ffd300;
  color: rgba(53, 42, 9, 0.94);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
  cursor: pointer;
}

.overlay__studio-panel {
  position: absolute;
  z-index: 6;
  width: 286px;
}

.overlay__studio-panel :deep(.studio-panel__drag-handle) {
  cursor: grab;
}

.overlay__eyebrow {
  display: none;
}

.overlay__handoff h1 {
  margin: 0;
  font-size: clamp(2rem, 3vw, 2.55rem);
  font-weight: 500;
}

.overlay__handoff-actions {
  display: none;
}

.overlay__hud {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 20px;
  border-radius: 20px;
  background: rgba(18, 24, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f7f3ea;
  cursor: default;
}

.overlay__copy {
  display: grid;
  gap: 6px;
}

.overlay__copy span,
.overlay__copy small {
  color: rgba(247, 243, 234, 0.74);
}

.overlay__actions {
  display: flex;
  gap: 12px;
}

.overlay__button {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.overlay__button--primary {
  background: #ffcb7a;
  color: #1f2c37;
}

.overlay__button--ghost {
  background: rgba(255, 255, 255, 0.08);
  color: #f7f3ea;
}

.overlay__button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.overlay__coords,
.overlay__error {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 3;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(18, 24, 30, 0.88);
  color: #f7f3ea;
  font-weight: 600;
}

.overlay__error {
  top: 24px;
  left: 24px;
  right: auto;
  max-width: min(640px, calc(100vw - 48px));
  border-radius: 16px;
  color: #ffd2cc;
}
</style>
