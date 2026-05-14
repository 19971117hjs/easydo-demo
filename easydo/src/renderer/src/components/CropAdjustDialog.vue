<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

type CropSelection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

type CropInteraction = {
  handle: CropHandle;
  start: { x: number; y: number };
  original: CropSelection;
};

const MIN_CROP_SIZE = 0.02;

const props = defineProps<{
  imageSrc: string;
  imageAlt?: string;
  imageWidth: number;
  imageHeight: number;
  initialSelection: CropSelection;
}>();

const emit = defineEmits<{
  (event: 'apply', value: CropSelection): void;
  (event: 'cancel'): void;
}>();

const imageRef = ref<HTMLImageElement | null>(null);
const selection = ref<CropSelection>(normalizeSelection(props.initialSelection));
const interaction = ref<CropInteraction | null>(null);
const cropHandles: CropHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const selectionStyle = computed(() => ({
  left: `${selection.value.x * 100}%`,
  top: `${selection.value.y * 100}%`,
  width: `${selection.value.width * 100}%`,
  height: `${selection.value.height * 100}%`,
}));

const cropPixelLabel = computed(() => {
  const width = Math.max(1, Math.round(selection.value.width * props.imageWidth));
  const height = Math.max(1, Math.round(selection.value.height * props.imageHeight));
  return `${width} x ${height}px`;
});

const cropPositionLabel = computed(() => {
  const x = Math.round(selection.value.x * props.imageWidth);
  const y = Math.round(selection.value.y * props.imageHeight);
  return `X ${x}, Y ${y}`;
});

watch(
  () => props.initialSelection,
  (value) => {
    selection.value = normalizeSelection(value);
  },
  { deep: true }
);

onBeforeUnmount(() => {
  stopWindowTracking();
});

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeSelection(value: CropSelection): CropSelection {
  const width = clamp(value.width || MIN_CROP_SIZE, MIN_CROP_SIZE, 1);
  const height = clamp(value.height || MIN_CROP_SIZE, MIN_CROP_SIZE, 1);
  return {
    x: clamp(value.x || 0, 0, 1 - width),
    y: clamp(value.y || 0, 0, 1 - height),
    width,
    height,
  };
}

function getImagePoint(event: PointerEvent): { x: number; y: number } | null {
  const rect = imageRef.value?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
}

function startWindowTracking(): void {
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
}

function stopWindowTracking(): void {
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerUp);
}

function startCropInteraction(handle: CropHandle, event: PointerEvent): void {
  const point = getImagePoint(event);
  if (!point) {
    return;
  }

  event.preventDefault();
  interaction.value = {
    handle,
    start: point,
    original: { ...selection.value },
  };
  startWindowTracking();
}

function resizeSelection(original: CropSelection, handle: CropHandle, dx: number, dy: number): CropSelection {
  let left = original.x;
  let top = original.y;
  let right = original.x + original.width;
  let bottom = original.y + original.height;

  if (handle.includes('w')) {
    left = clamp(original.x + dx, 0, right - MIN_CROP_SIZE);
  }

  if (handle.includes('e')) {
    right = clamp(original.x + original.width + dx, left + MIN_CROP_SIZE, 1);
  }

  if (handle.includes('n')) {
    top = clamp(original.y + dy, 0, bottom - MIN_CROP_SIZE);
  }

  if (handle.includes('s')) {
    bottom = clamp(original.y + original.height + dy, top + MIN_CROP_SIZE, 1);
  }

  return normalizeSelection({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  });
}

function moveSelection(original: CropSelection, dx: number, dy: number): CropSelection {
  return normalizeSelection({
    ...original,
    x: clamp(original.x + dx, 0, 1 - original.width),
    y: clamp(original.y + dy, 0, 1 - original.height),
  });
}

function handlePointerMove(event: PointerEvent): void {
  const state = interaction.value;
  const point = getImagePoint(event);
  if (!state || !point) {
    return;
  }

  const dx = point.x - state.start.x;
  const dy = point.y - state.start.y;
  selection.value =
    state.handle === 'move'
      ? moveSelection(state.original, dx, dy)
      : resizeSelection(state.original, state.handle, dx, dy);
}

function handlePointerUp(): void {
  interaction.value = null;
  stopWindowTracking();
}

function getPlainSelection(): CropSelection {
  return {
    x: selection.value.x,
    y: selection.value.y,
    width: selection.value.width,
    height: selection.value.height,
  };
}

function applySelection(): void {
  emit('apply', getPlainSelection());
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('cancel');
    return;
  }

  if (event.key === 'Enter') {
    applySelection();
  }
}
</script>

<template>
  <div class="crop-overlay" @keydown="handleKeyDown">
    <section class="crop-dialog" role="dialog" aria-modal="true" aria-label="Adjust crop area">
      <header class="crop-dialog__header">
        <div>
          <strong>Adjust crop</strong>
          <p>Drag the frame or its handles, then apply when the crop looks right.</p>
        </div>

        <button class="crop-dialog__close" type="button" @click="emit('cancel')">
          x
        </button>
      </header>

      <div class="crop-dialog__body">
        <div class="crop-canvas">
          <div class="crop-image-frame">
            <img
              ref="imageRef"
              class="crop-image"
              :src="imageSrc"
              :alt="imageAlt ?? 'Screenshot to crop'"
              draggable="false"
            />

            <div
              class="crop-selection"
              :style="selectionStyle"
              @pointerdown="startCropInteraction('move', $event)"
            >
              <span
                v-for="handle in cropHandles"
                :key="handle"
                class="crop-selection__handle"
                :class="`crop-selection__handle--${handle}`"
                @pointerdown.stop="startCropInteraction(handle, $event)"
              ></span>
            </div>
          </div>
        </div>

        <aside class="crop-panel">
          <div class="crop-panel__stat">
            <span>Crop size</span>
            <strong>{{ cropPixelLabel }}</strong>
          </div>
          <div class="crop-panel__stat">
            <span>Position</span>
            <strong>{{ cropPositionLabel }}</strong>
          </div>
          <div class="crop-panel__hint">
            The crop is not saved until you click Apply crop.
          </div>
        </aside>
      </div>

      <footer class="crop-dialog__footer">
        <button class="secondary-button" type="button" @click="selection = normalizeSelection(initialSelection)">
          Reset frame
        </button>
        <div class="crop-dialog__actions">
          <button class="secondary-button" type="button" @click="emit('cancel')">
            Cancel
          </button>
          <button class="primary-button" type="button" @click="applySelection">
            Apply crop
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.crop-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(21, 28, 38, 0.5);
  display: grid;
  place-items: center;
  padding: 28px;
}

.crop-dialog {
  width: min(1180px, calc(100vw - 56px));
  height: min(820px, calc(100vh - 56px));
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(17, 25, 38, 0.22);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.crop-dialog__header,
.crop-dialog__footer {
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid #e6e9ef;
}

.crop-dialog__header p {
  margin: 4px 0 0;
  color: #6f7785;
  font-size: 13px;
}

.crop-dialog__close {
  width: 34px;
  height: 34px;
  border: 1px solid #d7dce4;
  border-radius: 999px;
  background: #fff;
  color: #3e4652;
  cursor: pointer;
}

.crop-dialog__body {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 18px;
  padding: 18px;
  background: #f4f6f9;
}

.crop-canvas {
  min-width: 0;
  min-height: 0;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
  background:
    linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%),
    #17202c;
  background-size: 22px 22px;
}

.crop-image-frame {
  position: relative;
  display: grid;
  max-width: 100%;
  max-height: 100%;
}

.crop-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
}

.crop-selection {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid #f5c542;
  box-shadow:
    0 0 0 9999px rgba(4, 9, 16, 0.52),
    inset 0 0 0 1px rgba(255, 255, 255, 0.76);
  cursor: move;
  touch-action: none;
}

.crop-selection::before,
.crop-selection::after {
  content: '';
  position: absolute;
  inset: 33.333% 0 auto;
  border-top: 1px solid rgba(255, 255, 255, 0.58);
}

.crop-selection::after {
  inset: 66.666% 0 auto;
}

.crop-selection__handle {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid #17202c;
  border-radius: 999px;
  background: #f5c542;
  box-shadow: 0 2px 8px rgba(17, 25, 38, 0.22);
}

.crop-selection__handle--nw {
  top: -8px;
  left: -8px;
  cursor: nwse-resize;
}

.crop-selection__handle--n {
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.crop-selection__handle--ne {
  top: -8px;
  right: -8px;
  cursor: nesw-resize;
}

.crop-selection__handle--e {
  top: 50%;
  right: -8px;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.crop-selection__handle--se {
  right: -8px;
  bottom: -8px;
  cursor: nwse-resize;
}

.crop-selection__handle--s {
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  cursor: ns-resize;
}

.crop-selection__handle--sw {
  bottom: -8px;
  left: -8px;
  cursor: nesw-resize;
}

.crop-selection__handle--w {
  top: 50%;
  left: -8px;
  transform: translateY(-50%);
  cursor: ew-resize;
}

.crop-panel {
  display: grid;
  align-content: start;
  gap: 12px;
}

.crop-panel__stat,
.crop-panel__hint {
  border: 1px solid #e0e4eb;
  border-radius: 10px;
  background: #fff;
  padding: 12px;
}

.crop-panel__stat span {
  display: block;
  color: #8a93a1;
  font-size: 12px;
  margin-bottom: 5px;
}

.crop-panel__stat strong {
  font-size: 15px;
}

.crop-panel__hint {
  color: #6f7785;
  font-size: 13px;
  line-height: 1.5;
}

.crop-dialog__footer {
  border-top: 1px solid #e6e9ef;
  border-bottom: none;
}

.crop-dialog__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.primary-button,
.secondary-button {
  height: 38px;
  border-radius: 8px;
  padding: 0 14px;
  font: inherit;
  cursor: pointer;
}

.primary-button {
  border: 1px solid #2d3138;
  background: #2d3138;
  color: #fff;
}

.secondary-button {
  border: 1px solid #d7dce4;
  background: #fff;
  color: #3e4652;
}

@media (max-width: 900px) {
  .crop-dialog {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
  }

  .crop-dialog__body {
    grid-template-columns: 1fr;
  }

  .crop-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
