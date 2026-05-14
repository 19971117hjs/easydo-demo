<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type {
  AnnotationCursorVariant,
  AnnotationLineStyle,
  AnnotationTooltipPlacement,
  StepAnnotation,
  StepAnnotationType,
  StepDraft,
  StepSettings,
  StepStatus,
} from '@shared/contracts';
import CropAdjustDialog from '@renderer/components/CropAdjustDialog.vue';
import RichTextEditor from '@renderer/components/RichTextEditor.vue';
import ScreenshotAnnotator from '@renderer/components/ScreenshotAnnotator.vue';
import { useEditorUiPrefs } from '@renderer/features/editor/useEditorUiPrefs';
import { resolveAssetUrl } from '@renderer/utils/asset-url';
import { getErrorMessage } from '@renderer/utils/error-message';
import { useWorkbenchStore } from '@renderer/stores/workbench';
import { getAnnotationBounds } from '@shared/step-annotations';

type AnnotationTool = 'select' | 'crop' | 'ocr' | StepAnnotationType;
type CropSelection = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type AddStepAction =
  | 'click-capture'
  | 'simple-capture'
  | 'import-images'
  | 'empty-step'
  | 'content-block';

const TOOL_OPTIONS: Array<{
  id: AnnotationTool;
  label: string;
  icon: string;
  hint: string;
}> = [
  { id: 'select', label: 'Select', icon: '⌖', hint: '选择和拖动标注' },
  { id: 'click', label: 'Click', icon: '①', hint: '添加点击编号' },
  { id: 'rect', label: 'Box', icon: '▭', hint: '矩形高亮' },
  { id: 'ellipse', label: 'Oval', icon: '◯', hint: '椭圆高亮' },
  { id: 'line', label: 'Line', icon: '／', hint: '线段指引' },
  { id: 'brush', label: 'Brush', icon: '〰', hint: '自由笔刷路径' },
  { id: 'arrow', label: 'Arrow', icon: '↗', hint: '箭头指引' },
  { id: 'highlight', label: 'Highlight', icon: '▨', hint: '半透明高亮区域' },
  { id: 'text', label: 'Text', icon: 'T', hint: '文字贴纸' },
  { id: 'tooltip', label: 'Tooltip', icon: '💬', hint: '带箭头说明气泡' },
  { id: 'blur', label: 'Blur', icon: '▓', hint: '模糊遮挡' },
  { id: 'magnify', label: 'Magnify', icon: '⊕', hint: '局部放大镜' },
  { id: 'cursor', label: 'Cursor', icon: '⌜', hint: '额外指针/输入光标' },
  { id: 'ocr', label: 'OCR', icon: 'OCR', hint: '识别当前截图里的文字内容' },
  { id: 'asset', label: 'Asset', icon: '▣', hint: '插入外部图片贴图' },
  { id: 'crop', label: 'Crop', icon: '⛶', hint: '裁切当前截图并重算标注' },
];

const COLOR_PRESETS = [
  '#f2b91f',
  '#356dff',
  '#ff6b57',
  '#17b26a',
  '#12181f',
  '#ffffff',
];
const FILL_PRESETS = [
  'rgba(247, 196, 34, 0.34)',
  'rgba(53, 109, 255, 0.18)',
  'rgba(255, 107, 87, 0.2)',
  'rgba(23, 178, 106, 0.18)',
  'rgba(18, 24, 31, 0.88)',
  'rgba(255, 255, 255, 0.84)',
];
const ANNOTATION_TYPE_LABELS: Record<StepAnnotationType, string> = {
  click: 'Click marker',
  rect: 'Rectangle',
  ellipse: 'Oval',
  line: 'Line',
  brush: 'Brush',
  arrow: 'Arrow',
  text: 'Text',
  blur: 'Blur',
  highlight: 'Highlight',
  magnify: 'Magnify',
  cursor: 'Cursor',
  asset: 'Asset sticker',
  tooltip: 'Tooltip',
};
const CURSOR_VARIANTS: Array<{
  value: AnnotationCursorVariant;
  label: string;
}> = [
  { value: 'pointer', label: 'Pointer' },
  { value: 'text', label: 'Text cursor' },
  { value: 'hand', label: 'Hand' },
];
const TOOLTIP_PLACEMENTS: Array<{
  value: AnnotationTooltipPlacement;
  label: string;
}> = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'top', label: 'Top' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];
const LINE_STYLE_OPTIONS: Array<{ value: AnnotationLineStyle; label: string }> =
  [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
  ];

const START_OPTIONS: Array<{
  id: AddStepAction;
  title: string;
  description: string;
}> = [
  {
    id: 'click-capture',
    title: 'Capture screenshots with mouse clicks',
    description: '按照操作顺序自动生成编号步骤。',
  },
  {
    id: 'simple-capture',
    title: 'Take simple screenshot',
    description: '立即抓取当前屏幕生成新步骤。',
  },
  {
    id: 'import-images',
    title: 'Import any images as new steps',
    description: '把已有截图直接导入成可编辑步骤。',
  },
  {
    id: 'empty-step',
    title: 'Empty step',
    description: '从空白步骤开始，先写说明再补图片。',
  },
  {
    id: 'content-block',
    title: 'Content block',
    description: '插入纯文本说明块，适合提示和过渡内容。',
  },
];

const ZOOM_PRESETS = [10, 15, 19, 25, 33, 50, 67, 75, 100];

const workbench = useWorkbenchStore();
const router = useRouter();
const {
  beginResize,
  editorBodyStyle,
  focusedViewEnabled,
  leftCollapsed,
  loadPrefs,
  rightCollapsed,
  stepsListGridView,
} = useEditorUiPrefs();

const selectedStepId = ref<string | null>(null);
const selectedAnnotationId = ref<string | null>(null);
const activeTool = ref<AnnotationTool>('select');
const menuOpen = ref(false);
const addStepMenuOpen = ref(false);
const stepMenuOpenId = ref<string | null>(null);
const imageActionsMenuOpen = ref(false);
const zoomMenuOpen = ref(false);
const exportMenuOpen = ref(false);
const previewOpen = ref(false);
const previewLoading = ref(false);
const introActionError = ref('');
const cropDialogSelection = ref<CropSelection | null>(null);
const zoomMode = ref<'fit' | 'manual'>('fit');
const manualZoom = ref(100);
const fitZoom = ref(100);
const stageViewportRef = ref<HTMLElement | null>(null);
const stepsListRef = ref<HTMLElement | null>(null);

let stopListening: (() => void) | null = null;
let stopAutoSteps: (() => void) | null = null;
let stopClickStatus: (() => void) | null = null;
let stopClickError: (() => void) | null = null;
let stopClickProgress: (() => void) | null = null;
let resizeObserver: ResizeObserver | null = null;

const currentProject = computed(() => workbench.currentProject);
const steps = computed(() => currentProject.value?.steps ?? []);
const hasSteps = computed(() => steps.value.length > 0);
const selectedStep = computed(
  () =>
    steps.value.find((step) => step.id === selectedStepId.value) ??
    steps.value[0] ??
    null
);
const selectedStepIndex = computed(() =>
  selectedStep.value
    ? steps.value.findIndex((step) => step.id === selectedStep.value?.id)
    : -1
);
const selectedStepAssetUrl = computed(() =>
  selectedStep.value?.asset ? resolveAssetUrl(selectedStep.value.asset) : ''
);
const annotationCount = computed(
  () => selectedStep.value?.annotations?.length ?? 0
);
const selectedAnnotation = computed(
  () =>
    selectedStep.value?.annotations?.find(
      (annotation) => annotation.id === selectedAnnotationId.value
    ) ?? null
);
const selectedAnnotationSelection = computed(() => {
  if (!selectedAnnotation.value) {
    return null;
  }

  const bounds = getAnnotationBounds(selectedAnnotation.value);
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
});
const selectedAnnotationLabel = computed(() =>
  selectedAnnotation.value
    ? ANNOTATION_TYPE_LABELS[selectedAnnotation.value.type]
    : ''
);
const activeToolMeta = computed(
  () =>
    TOOL_OPTIONS.find((tool) => tool.id === activeTool.value) ?? TOOL_OPTIONS[0]
);
const clickStreamActive = computed(
  () =>
    workbench.clickStreamStatus !== 'idle' &&
    workbench.clickStreamStatus !== 'stopped'
);
const selectedStepAsset = computed(() => selectedStep.value?.asset ?? null);
const cropUndoCount = computed(
  () =>
    selectedStep.value?.cropRestoreHistory?.length ??
    (selectedStep.value?.cropRestoreState ? 1 : 0)
);
const canRestoreCroppedAsset = computed(() =>
  cropUndoCount.value > 0
);
const cropDialogStep = computed(() =>
  cropDialogSelection.value && selectedStep.value?.asset ? selectedStep.value : null
);
const cropDialogAsset = computed(() => cropDialogStep.value?.asset ?? null);
const resolvedZoom = computed(() =>
  zoomMode.value === 'fit' ? fitZoom.value : manualZoom.value
);
const zoomLabel = computed(() => `${Math.round(resolvedZoom.value)}%`);
const isGuideIntroState = computed(
  () => Boolean(currentProject.value) && !hasSteps.value
);
const canMoveStepUp = computed(() => selectedStepIndex.value > 0);
const canMoveStepDown = computed(
  () =>
    selectedStepIndex.value !== -1 &&
    selectedStepIndex.value < steps.value.length - 1
);
const clickProgressText = computed(() => {
  const progress = workbench.clickStreamProgress;
  return `accepted ${progress.acceptedCount} · queued ${progress.queuedCount} · completed ${progress.completedCount}`;
});
const stepCounterLabel = computed(() => {
  if (!selectedStep.value || selectedStepIndex.value === -1) {
    return 'No step selected';
  }

  return `${selectedStepIndex.value + 1}. ${
    selectedStep.value.title || 'Untitled step'
  }`;
});
const currentProjectDateLabel = computed(() => {
  if (!currentProject.value) {
    return '';
  }

  return new Date(currentProject.value.updatedAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
});
const introStatusText = computed(() => {
  if (introActionError.value) {
    return introActionError.value;
  }

  if (workbench.clickStreamStatus === 'handoff') {
    return 'Choose the target screen in the capture overlay, then continue recording there.';
  }

  if (workbench.clickStreamStatus === 'setup') {
    return 'Set what to capture in the floating capture controls, then start recording.';
  }

  if (workbench.clickStreamStatus === 'paused') {
    return 'Click capture is paused. Adjust what to capture in the floating controls, then resume or finish.';
  }

  if (clickStreamActive.value) {
    return `Click capture is live: ${clickProgressText.value}. Switch to the target app and click through the workflow.`;
  }

  if (workbench.clickStreamError) {
    return workbench.clickStreamError;
  }

  if (!workbench.permissionSnapshot?.canCaptureScreens) {
    return 'Permissions still need verification, but the recorder now attempts the real capture flow instead of blocking here first.';
  }

  return 'Your guide has no steps yet. Add new steps from:';
});
const introStatusTone = computed(() => {
  if (introActionError.value) {
    return 'danger';
  }
  if (workbench.clickStreamError) {
    return 'danger';
  }
  if (clickStreamActive.value) {
    return 'active';
  }
  if (!workbench.permissionSnapshot?.canCaptureScreens) {
    return 'warning';
  }
  return 'neutral';
});

const annotationSupportsFill = computed(() =>
  Boolean(
    selectedAnnotation.value &&
      ['rect', 'ellipse', 'highlight', 'text', 'tooltip'].includes(
        selectedAnnotation.value.type
      )
  )
);
const annotationSupportsOpacity = computed(() =>
  Boolean(
    selectedAnnotation.value &&
      [
        'rect',
        'ellipse',
        'highlight',
        'text',
        'tooltip',
        'asset',
        'magnify',
      ].includes(selectedAnnotation.value.type)
  )
);
const annotationSupportsText = computed(
  () =>
    selectedAnnotation.value?.type === 'text' ||
    selectedAnnotation.value?.type === 'tooltip'
);
const annotationSupportsLine = computed(() =>
  Boolean(
    selectedAnnotation.value &&
      ['rect', 'ellipse', 'line', 'brush', 'arrow', 'highlight'].includes(
        selectedAnnotation.value.type
      )
  )
);
const annotationSupportsArrowHeads = computed(
  () =>
    selectedAnnotation.value?.type === 'line' ||
    selectedAnnotation.value?.type === 'arrow'
);
const annotationSupportsShadow = computed(() =>
  Boolean(
    selectedAnnotation.value &&
      ['tooltip', 'magnify', 'asset'].includes(selectedAnnotation.value.type)
  )
);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCompleteStepSettings(step: StepDraft): StepSettings {
  return {
    forceNewPage: step.settings?.forceNewPage ?? false,
    isContentBlock:
      step.settings?.isContentBlock ??
      (step.kind === 'content' || step.kind === 'note'),
    isMultiCaptureStep: step.settings?.isMultiCaptureStep ?? false,
    includeSubstepTitles: step.settings?.includeSubstepTitles ?? true,
    showStepNumber: step.settings?.showStepNumber ?? step.kind !== 'content',
  };
}

function ensureSelectedStep(stepId?: string | null): void {
  if (stepId && steps.value.some((step) => step.id === stepId)) {
    selectedStepId.value = stepId;
    return;
  }

  selectedStepId.value = steps.value.at(-1)?.id ?? steps.value[0]?.id ?? null;
}

function closeTransientPanels(): void {
  addStepMenuOpen.value = false;
  stepMenuOpenId.value = null;
  imageActionsMenuOpen.value = false;
  zoomMenuOpen.value = false;
}

function handleGlobalPointerDown(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    closeTransientPanels();
    return;
  }

  if (!target.closest('.add-step-anchor')) {
    addStepMenuOpen.value = false;
  }

  if (!target.closest('.step-card__menu-wrap')) {
    stepMenuOpenId.value = null;
  }

  if (!target.closest('.image-actions-menu-wrap')) {
    imageActionsMenuOpen.value = false;
  }

  if (!target.closest('.zoom-control')) {
    zoomMenuOpen.value = false;
  }

  if (!target.closest('.export-split')) {
    exportMenuOpen.value = false;
  }
}

function selectStep(stepId: string): void {
  selectedStepId.value = stepId;
  stepMenuOpenId.value = null;
}

function addStep(kind: StepDraft['kind'] = 'action'): void {
  const nextId = workbench.addStep(kind);
  ensureSelectedStep(nextId);
  addStepMenuOpen.value = false;
}

function insertStepRelative(
  targetStep: StepDraft,
  position: 'before' | 'after',
  kind: StepDraft['kind'] = 'action'
): void {
  const index = steps.value.findIndex((step) => step.id === targetStep.id);
  if (index === -1) {
    return;
  }

  const nextId = workbench.insertStep(
    index + (position === 'after' ? 1 : 0),
    kind
  );
  ensureSelectedStep(nextId);
  stepMenuOpenId.value = null;
}

async function runAddStepAction(action: AddStepAction): Promise<void> {
  closeTransientPanels();
  introActionError.value = '';

  try {
    if (action === 'click-capture') {
      await workbench.startClickStream();
      return;
    }

    if (action === 'simple-capture') {
      await workbench.captureCurrentStep();
      ensureSelectedStep(workbench.lastCaptureResult?.capturedStep.id ?? null);
      return;
    }

    if (action === 'import-images') {
      const imported = await workbench.importImagesAsSteps();
      ensureSelectedStep(imported.at(-1)?.id ?? null);
      return;
    }

    if (action === 'content-block') {
      addStep('content');
      return;
    }

    addStep('action');
  } catch (error) {
    introActionError.value = getErrorMessage(error);
  }
}

function updateIntroGuideName(value: string): void {
  workbench.updateProjectMeta({ name: value });
}

function updateSelectedStep(patch: Partial<StepDraft>): void {
  if (!selectedStep.value) {
    return;
  }

  workbench.updateStep(selectedStep.value.id, patch);
}

function updateSelectedAnnotations(annotations: StepAnnotation[]): void {
  updateSelectedStep({ annotations });
}

function updateSelectedAnnotationPatch(patch: Partial<StepAnnotation>): void {
  if (!selectedStep.value || !selectedAnnotationId.value) {
    return;
  }

  updateSelectedAnnotations(
    (selectedStep.value.annotations ?? []).map((annotation) =>
      annotation.id === selectedAnnotationId.value
        ? { ...annotation, ...patch }
        : annotation
    )
  );
}

function updateSelectedAnnotationNumberField(
  field:
    | 'strokeWidth'
    | 'fontSize'
    | 'fontWeight'
    | 'opacity'
    | 'radius'
    | 'magnifyZoom'
    | 'blurAmount',
  value: string
): void {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return;
  }

  updateSelectedAnnotationPatch({
    [field]: numeric,
  } as Partial<StepAnnotation>);
}

function applyAnnotationPreset(
  field: 'color' | 'fillColor' | 'textColor' | 'backgroundColor',
  value: string
): void {
  updateSelectedAnnotationPatch({ [field]: value } as Partial<StepAnnotation>);
}

function duplicateSelectedStep(): void {
  if (!selectedStep.value) {
    return;
  }

  const nextId = workbench.duplicateStep(selectedStep.value.id);
  ensureSelectedStep(nextId);
}

function removeSelectedStep(): void {
  if (!selectedStep.value) {
    return;
  }

  const currentId = selectedStep.value.id;
  const currentIndex = selectedStepIndex.value;
  workbench.removeStep(currentId);
  const nextStep =
    steps.value[currentIndex] ??
    steps.value[currentIndex - 1] ??
    steps.value[0] ??
    null;
  selectedStepId.value = nextStep?.id ?? null;
}

function removeSelectedAnnotation(): void {
  if (!selectedStep.value || !selectedAnnotationId.value) {
    return;
  }

  updateSelectedAnnotations(
    (selectedStep.value.annotations ?? []).filter(
      (annotation) => annotation.id !== selectedAnnotationId.value
    )
  );
  selectedAnnotationId.value = null;
}

function moveSelectedAnnotationLayer(
  mode: 'forward' | 'backward' | 'front' | 'back'
): void {
  if (!selectedStep.value || !selectedAnnotationId.value) {
    return;
  }

  const annotations = [...(selectedStep.value.annotations ?? [])];
  const currentIndex = annotations.findIndex(
    (annotation) => annotation.id === selectedAnnotationId.value
  );
  if (currentIndex === -1) {
    return;
  }

  let nextIndex = currentIndex;
  if (mode === 'forward') {
    nextIndex = Math.min(annotations.length - 1, currentIndex + 1);
  } else if (mode === 'backward') {
    nextIndex = Math.max(0, currentIndex - 1);
  } else if (mode === 'front') {
    nextIndex = annotations.length - 1;
  } else {
    nextIndex = 0;
  }

  if (nextIndex === currentIndex) {
    return;
  }

  const [moved] = annotations.splice(currentIndex, 1);
  if (!moved) {
    return;
  }

  annotations.splice(nextIndex, 0, moved);
  updateSelectedAnnotations(annotations);
}

async function setActiveTool(tool: AnnotationTool): Promise<void> {
  if (tool === 'ocr') {
    workbench.toggleOcr();
    activeTool.value = 'select';
    return;
  }

  if (tool === 'asset') {
    if (!selectedStep.value) {
      return;
    }

    const annotation = await workbench.importAnnotationAsset(
      selectedStep.value.id
    );
    if (annotation) {
      selectedAnnotationId.value = annotation.id;
    }
    activeTool.value = 'select';
    return;
  }

  activeTool.value = tool;
}

async function runFullStepOcr(): Promise<void> {
  if (!selectedStep.value?.asset) {
    return;
  }

  workbench.toggleOcr(true);
  await workbench.recognizeStepText(selectedStep.value.id);
}

async function runSelectedAreaOcr(): Promise<void> {
  if (!selectedStep.value?.asset || !selectedAnnotationSelection.value) {
    return;
  }

  workbench.toggleOcr(true);
  await workbench.recognizeStepText(
    selectedStep.value.id,
    selectedAnnotationSelection.value
  );
}

async function handleCropRequest(selection: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Promise<void> {
  if (!selectedStep.value?.asset) {
    activeTool.value = 'select';
    return;
  }

  if (selection.width < 0.01 || selection.height < 0.01) {
    activeTool.value = 'select';
    return;
  }

  cropDialogSelection.value = selection;
  activeTool.value = 'select';
}

function cancelCropDialog(): void {
  cropDialogSelection.value = null;
  activeTool.value = 'select';
}

async function applyCropDialog(selection: CropSelection): Promise<void> {
  if (!selectedStep.value?.asset) {
    cancelCropDialog();
    return;
  }

  const plainSelection = {
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
  };
  cropDialogSelection.value = null;
  await workbench.cropStepAsset(selectedStep.value.id, plainSelection);
  selectedAnnotationId.value = null;
  activeTool.value = 'select';
  void refreshFitZoom();
}

function toggleStepMenu(stepId: string): void {
  stepMenuOpenId.value = stepMenuOpenId.value === stepId ? null : stepId;
}

function moveSelectedStep(direction: 'up' | 'down'): void {
  if (selectedStepIndex.value === -1) {
    return;
  }

  const nextIndex =
    direction === 'up'
      ? selectedStepIndex.value - 1
      : selectedStepIndex.value + 1;
  if (nextIndex < 0 || nextIndex >= steps.value.length) {
    return;
  }

  workbench.moveStep(selectedStepIndex.value, nextIndex);
  ensureSelectedStep(selectedStep.value?.id ?? null);
}

function moveStepCard(step: StepDraft, direction: 'up' | 'down'): void {
  const index = steps.value.findIndex((item) => item.id === step.id);
  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || nextIndex < 0 || nextIndex >= steps.value.length) {
    return;
  }

  workbench.moveStep(index, nextIndex);
  selectedStepId.value = step.id;
  stepMenuOpenId.value = null;
}

function duplicateStepCard(step: StepDraft): void {
  const nextId = workbench.duplicateStep(step.id);
  ensureSelectedStep(nextId);
  stepMenuOpenId.value = null;
}

function removeStepCard(step: StepDraft): void {
  if (!window.confirm(`Delete "${step.title || 'this step'}"?`)) {
    return;
  }

  const isCurrent = selectedStepId.value === step.id;
  const index = steps.value.findIndex((item) => item.id === step.id);
  workbench.removeStep(step.id);
  if (isCurrent) {
    const nextStep =
      steps.value[index] ?? steps.value[index - 1] ?? steps.value[0] ?? null;
    selectedStepId.value = nextStep?.id ?? null;
  }
  stepMenuOpenId.value = null;
}

async function saveCurrentProject(): Promise<void> {
  await workbench.saveProject();
}

async function exportCurrentProject(): Promise<void> {
  exportMenuOpen.value = false;
  await workbench.exportProjectHtml();
}

async function openPreview(): Promise<void> {
  exportMenuOpen.value = false;
  previewLoading.value = true;
  try {
    await workbench.refreshPreviewHtml();
    previewOpen.value = true;
  } finally {
    previewLoading.value = false;
  }
}

async function openLastExport(): Promise<void> {
  exportMenuOpen.value = false;
  await workbench.openExportedHtml();
}

async function exportSelectedImage(): Promise<void> {
  if (!selectedStepAsset.value) {
    return;
  }

  await window.easydo.exports.openPath(selectedStepAsset.value.absolutePath);
}

async function restoreSelectedStepCrop(): Promise<void> {
  imageActionsMenuOpen.value = false;

  if (!selectedStep.value || !canRestoreCroppedAsset.value) {
    return;
  }

  await workbench.restoreStepAsset(selectedStep.value.id);
  selectedAnnotationId.value = null;
  activeTool.value = 'select';
  void refreshFitZoom();
}

async function runStepImageAction(
  action: 'capture' | 'capture-area' | 'import' | 'reveal'
): Promise<void> {
  imageActionsMenuOpen.value = false;

  if (action === 'capture') {
    await workbench.captureCurrentStep();
    ensureSelectedStep(workbench.lastCaptureResult?.capturedStep.id ?? null);
    return;
  }

  if (action === 'capture-area') {
    await workbench.beginAreaSelection();
    ensureSelectedStep(workbench.lastCaptureResult?.capturedStep.id ?? null);
    return;
  }

  if (action === 'import') {
    const imported = await workbench.importImagesAsSteps();
    ensureSelectedStep(imported.at(-1)?.id ?? null);
    return;
  }

  if (selectedStepAsset.value) {
    await window.easydo.exports.openPath(selectedStepAsset.value.absolutePath);
  }
}

function setZoomPreset(value: number | 'fit'): void {
  if (value === 'fit') {
    zoomMode.value = 'fit';
  } else {
    zoomMode.value = 'manual';
    manualZoom.value = value;
  }

  zoomMenuOpen.value = false;
}

function nudgeZoom(direction: 'in' | 'out'): void {
  setZoomPreset(getNextZoom(resolvedZoom.value, direction));
}

function recalculateFitZoom(): void {
  const viewport = stageViewportRef.value;
  const asset = selectedStep.value?.asset;

  if (!viewport || !asset) {
    fitZoom.value = 100;
    return;
  }

  const viewportWidth = Math.max(280, viewport.clientWidth - 96);
  const viewportHeight = Math.max(
    180,
    viewport.clientHeight - (focusedViewEnabled.value ? 120 : 92)
  );
  const widthRatio = viewportWidth / asset.width;
  const heightRatio = viewportHeight / asset.height;
  const nextZoom = Math.floor(Math.min(widthRatio, heightRatio, 1) * 100);
  fitZoom.value = clamp(nextZoom || 100, 8, 100);
}

async function refreshFitZoom(): Promise<void> {
  await nextTick();
  recalculateFitZoom();
}

async function openGuidesHome(): Promise<void> {
  menuOpen.value = false;
  closeTransientPanels();
  await router.push('/');
}

async function openRecorderLab(): Promise<void> {
  menuOpen.value = false;
  closeTransientPanels();
  await router.push('/recorder');
}

function toggleFocusedView(): void {
  focusedViewEnabled.value = !focusedViewEnabled.value;
}

function getNextZoom(current: number, direction: 'in' | 'out'): number {
  const presets = Array.from(
    new Set([...ZOOM_PRESETS, Math.round(current)])
  ).sort((left, right) => left - right);
  if (direction === 'in') {
    return (
      presets.find((value) => value > current) ?? presets.at(-1) ?? current
    );
  }
  return (
    [...presets].reverse().find((value) => value < current) ??
    presets[0] ??
    current
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], .tox, .mce-content-body, iframe"
    )
  );
}

function handleWindowKeydown(event: KeyboardEvent): void {
  if (isTypingTarget(event.target)) {
    return;
  }

  if (cropDialogSelection.value) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelCropDialog();
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      void applyCropDialog(cropDialogSelection.value);
    }

    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    void saveCurrentProject();
    return;
  }

  if (
    (event.metaKey || event.ctrlKey) &&
    event.shiftKey &&
    event.key.toLowerCase() === 'e'
  ) {
    event.preventDefault();
    void exportCurrentProject();
    return;
  }

  if (
    (event.metaKey || event.ctrlKey) &&
    event.shiftKey &&
    event.key.toLowerCase() === 'p'
  ) {
    event.preventDefault();
    void openPreview();
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveSelectedStep('up');
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveSelectedStep('down');
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedAnnotationId.value) {
      event.preventDefault();
      removeSelectedAnnotation();
    }
    return;
  }

  if (event.key === '=' || event.key === '+') {
    event.preventDefault();
    setZoomPreset(getNextZoom(resolvedZoom.value, 'in'));
    return;
  }

  if (event.key === '-') {
    event.preventDefault();
    setZoomPreset(getNextZoom(resolvedZoom.value, 'out'));
  }
}

watch(
  () => steps.value.map((step) => step.id).join('|'),
  () => {
    if (!selectedStepId.value && steps.value.length > 0) {
      selectedStepId.value = steps.value[0].id;
      return;
    }

    if (
      selectedStepId.value &&
      !steps.value.some((step) => step.id === selectedStepId.value)
    ) {
      selectedStepId.value = steps.value[0]?.id ?? null;
    }
  },
  { immediate: true }
);

watch(
  () => selectedStep.value?.id,
  () => {
    selectedAnnotationId.value = null;
    cropDialogSelection.value = null;
    activeTool.value = 'select';
    stepMenuOpenId.value = null;
    void refreshFitZoom();
    nextTick(() => {
      const row = stepsListRef.value?.querySelector<HTMLElement>(
        `[data-step-id="${selectedStepId.value}"]`
      );
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
);

watch(
  () => workbench.lastCaptureResult?.capturedStep.id,
  (value) => {
    if (value) {
      selectedStepId.value = value;
      void refreshFitZoom();
    }
  }
);

watch([leftCollapsed, rightCollapsed, focusedViewEnabled], () => {
  if (zoomMode.value === 'fit') {
    void refreshFitZoom();
  }
});

onMounted(async () => {
  if (!workbench.currentProject) {
    await workbench.bootstrap();
  }

  await loadPrefs();

  stopListening = workbench.listenCaptureState();
  stopAutoSteps = workbench.listenAutoStepCreated();
  stopClickStatus = workbench.listenClickStreamStatus();
  stopClickError = workbench.listenClickStreamError();
  stopClickProgress = workbench.listenClickStreamProgress();

  if (!selectedStepId.value && steps.value.length > 0) {
    selectedStepId.value = steps.value[0].id;
  }

  resizeObserver = new ResizeObserver(() => {
    if (zoomMode.value === 'fit') {
      recalculateFitZoom();
    }
  });

  if (stageViewportRef.value) {
    resizeObserver.observe(stageViewportRef.value);
  }

  window.addEventListener('pointerdown', handleGlobalPointerDown);
  window.addEventListener('keydown', handleWindowKeydown);
  window.addEventListener('resize', recalculateFitZoom);
  await refreshFitZoom();
});

onUnmounted(() => {
  stopListening?.();
  stopAutoSteps?.();
  stopClickStatus?.();
  stopClickError?.();
  stopClickProgress?.();
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('pointerdown', handleGlobalPointerDown);
  window.removeEventListener('keydown', handleWindowKeydown);
  window.removeEventListener('resize', recalculateFitZoom);
});
</script>

<template>
  <section v-if="currentProject" class="editor-page">
    <header
      class="editor-topbar"
      :class="{ 'editor-topbar--intro': isGuideIntroState }"
    >
      <div class="topbar-left">
        <button
          class="menu-trigger"
          type="button"
          @click="menuOpen = !menuOpen"
        >
          <span class="menu-trigger__icon">☰</span>
          <span>Menu</span>
        </button>
      </div>

      <div class="topbar-center">
        <div class="topbar-title-row">
          <div class="topbar-title">
            {{ currentProject.name || 'Untitled Guide' }}
          </div>
          <button
            class="chrome-icon-button"
            type="button"
            title="Guide settings"
          >
            ⚙
          </button>
        </div>
        <div v-if="!isGuideIntroState" class="topbar-subtitle">
          {{ currentProjectDateLabel }}
        </div>
      </div>

      <div class="topbar-right">
        <template v-if="!isGuideIntroState">
          <button
            class="topbar-save-button"
            type="button"
            @click="saveCurrentProject"
          >
            Save
          </button>
          <button
            v-if="clickStreamActive"
            class="status-button"
            type="button"
            @click="workbench.stopClickStream()"
          >
            Stop Capture
          </button>

          <div class="export-split">
            <button
              class="export-button export-button--primary"
              type="button"
              :disabled="workbench.isExporting"
              @click="exportCurrentProject()"
            >
              {{ workbench.isExporting ? 'Exporting...' : 'Export HTML' }}
            </button>
            <button
              class="export-button export-button--toggle"
              type="button"
              :disabled="workbench.isExporting"
              @click="exportMenuOpen = !exportMenuOpen"
            >
              ▾
            </button>

            <div v-if="exportMenuOpen" class="export-menu">
              <button type="button" @click="exportCurrentProject()">
                Export HTML
              </button>
              <button
                type="button"
                :disabled="previewLoading"
                @click="openPreview()"
              >
                {{ previewLoading ? 'Loading preview...' : 'Preview HTML' }}
              </button>
              <button
                type="button"
                :disabled="!workbench.lastExportResult"
                @click="openLastExport()"
              >
                Open last export
              </button>
            </div>
          </div>

          <div class="zoom-control">
            <button
              class="zoom-button"
              type="button"
              @click="zoomMenuOpen = !zoomMenuOpen"
            >
              <span>{{ zoomLabel }}</span>
              <span class="zoom-button__arrow">▾</span>
            </button>

            <div v-if="zoomMenuOpen" class="zoom-menu">
              <button
                type="button"
                class="zoom-option"
                :class="{ 'zoom-option--active': zoomMode === 'fit' }"
                @click="setZoomPreset('fit')"
              >
                <span>Auto fit</span>
                <span>{{ fitZoom }}%</span>
              </button>
              <button
                v-for="preset in ZOOM_PRESETS"
                :key="preset"
                type="button"
                class="zoom-option"
                :class="{
                  'zoom-option--active':
                    zoomMode === 'manual' && manualZoom === preset,
                }"
                @click="setZoomPreset(preset)"
              >
                {{ preset }}%
              </button>
            </div>
          </div>
        </template>

        <div class="avatar-chip">J</div>
      </div>
    </header>

    <div v-if="menuOpen" class="menu-overlay" @click="menuOpen = false">
      <aside class="menu-drawer" @click.stop>
        <div class="menu-drawer__header">
          <strong>Menu</strong>
          <button
            class="chrome-icon-button"
            type="button"
            @click="menuOpen = false"
          >
            ✕
          </button>
        </div>

        <div class="menu-drawer__group">
          <button class="menu-item" type="button" @click="openGuidesHome">
            Home
          </button>
          <button class="menu-item" type="button" @click="openRecorderLab">
            Recorder
          </button>
          <button
            class="menu-item"
            type="button"
            @click="
              saveCurrentProject();
              menuOpen = false;
            "
          >
            Save
          </button>
          <button
            class="menu-item"
            type="button"
            @click="
              openPreview();
              menuOpen = false;
            "
          >
            Preview HTML
          </button>
          <button
            class="menu-item menu-item--accent"
            type="button"
            @click="
              exportCurrentProject();
              menuOpen = false;
            "
          >
            Export HTML
          </button>
          <button
            class="menu-item"
            type="button"
            :disabled="!workbench.lastExportResult"
            @click="
              openLastExport();
              menuOpen = false;
            "
          >
            Open last export
          </button>
        </div>

        <div class="menu-drawer__group menu-drawer__group--muted">
          <button class="menu-item" type="button" disabled>Settings</button>
          <button class="menu-item" type="button" disabled>
            Suggest a feature
          </button>
          <button class="menu-item" type="button" disabled>Online Help</button>
          <button class="menu-item" type="button" disabled>
            Check for updates
          </button>
        </div>

        <div class="menu-drawer__footer">
          <div>{{ workbench.saveMessage }}</div>
          <div>easyDo recovery build</div>
        </div>
      </aside>
    </div>

    <section v-if="isGuideIntroState" class="guide-intro">
      <div class="guide-intro__content">
        <div class="guide-intro__symbol">🖐</div>
        <h2>Start building your guide.</h2>
        <input
          class="guide-intro__name"
          :value="currentProject.name"
          @input="
            updateIntroGuideName(($event.target as HTMLInputElement).value)
          "
        />

        <p
          class="guide-intro__status"
          :class="{
            'guide-intro__status--warning': introStatusTone === 'warning',
            'guide-intro__status--danger': introStatusTone === 'danger',
            'guide-intro__status--active': introStatusTone === 'active',
          }"
        >
          {{ introStatusText }}
        </p>

        <div class="guide-intro__actions">
          <button
            v-for="option in START_OPTIONS"
            :key="option.id"
            type="button"
            class="guide-intro__action"
            :disabled="clickStreamActive && option.id !== 'click-capture'"
            @click="runAddStepAction(option.id)"
          >
            {{ option.title }}
          </button>
        </div>

        <div class="guide-intro__footer">
          <button
            v-if="clickStreamActive"
            class="secondary-button"
            type="button"
            @click="workbench.stopClickStream()"
          >
            Stop click capture
          </button>
          <button
            class="secondary-button"
            type="button"
            @click="workbench.refreshPermissions()"
          >
            Refresh permissions
          </button>
        </div>
      </div>
    </section>

    <section v-else class="editor-body" :style="editorBodyStyle">
      <aside
        class="steps-panel"
        :class="{ 'steps-panel--collapsed': leftCollapsed }"
      >
        <button
          v-if="leftCollapsed"
          class="panel-edge-toggle panel-edge-toggle--left"
          type="button"
          @click="leftCollapsed = false"
        >
          ›
        </button>

        <template v-else>
          <div class="panel-header panel-header--steps">
            <div class="steps-header-icons">
              <button
                class="steps-view-toggle"
                type="button"
                :class="{ 'steps-view-toggle--active': stepsListGridView }"
                title="Step list with previews"
                @click="stepsListGridView = true"
              >
                ☷
              </button>
              <button
                class="steps-view-toggle"
                type="button"
                :class="{ 'steps-view-toggle--active': !stepsListGridView }"
                title="Step list without previews"
                @click="stepsListGridView = false"
              >
                ▤
              </button>
            </div>

            <div class="steps-header-title">
              <strong>Steps</strong>
              <span>{{ steps.length }}</span>
            </div>

            <button
              class="collapse-trigger"
              type="button"
              @click="leftCollapsed = true"
            >
              ‹
            </button>
          </div>

          <div class="steps-actions add-step-anchor">
            <button
              class="add-step-button"
              type="button"
              @click="addStepMenuOpen = !addStepMenuOpen"
            >
              <span>＋</span>
              <span>Add Step</span>
            </button>

            <button
              class="ghost-icon-button"
              type="button"
              title="More actions"
            >
              ⋯
            </button>

            <div v-if="addStepMenuOpen" class="add-step-menu">
              <button type="button" @click="runAddStepAction('click-capture')">
                Capture screenshots with mouse clicks
              </button>
              <button type="button" @click="runAddStepAction('simple-capture')">
                Take simple screenshot
              </button>
              <button type="button" @click="runAddStepAction('import-images')">
                Import any images as new steps
              </button>
              <button type="button" @click="runAddStepAction('empty-step')">
                Empty step
              </button>
              <button type="button" @click="runAddStepAction('content-block')">
                Content block
              </button>
            </div>
          </div>

          <div
            v-if="steps.length"
            ref="stepsListRef"
            class="steps-list"
            :class="{ 'steps-list--compact': !stepsListGridView }"
          >
            <button
              v-for="step in steps"
              :key="step.id"
              type="button"
              class="step-card"
              :data-step-id="step.id"
              :class="{
                'step-card--active': selectedStep?.id === step.id,
                'step-card--compact': !stepsListGridView,
              }"
              @click="selectStep(step.id)"
            >
              <div v-if="stepsListGridView" class="step-card__thumb">
                <img
                  v-if="step.asset"
                  :src="resolveAssetUrl(step.asset)"
                  :alt="step.title"
                />
                <div v-else class="step-card__thumb-empty">
                  {{ step.kind === 'content' ? 'Text' : 'No image' }}
                </div>
                <span v-if="step.stepNumber" class="step-card__badge">{{
                  step.stepNumber
                }}</span>
                <span v-if="step.clickIndex" class="step-card__click"
                  >#{{ step.clickIndex }}</span
                >
              </div>

              <div class="step-card__body">
                <div class="step-card__title-row">
                  <div class="step-card__title-row-main">
                    <span
                      v-if="!stepsListGridView && step.stepNumber"
                      class="step-card__inline-badge"
                    >
                      {{ step.stepNumber }}
                    </span>
                    <div class="step-card__title">
                      {{ step.title || 'Untitled step' }}
                    </div>
                  </div>
                  <div class="step-card__menu-wrap">
                    <button
                      class="step-card__menu-button"
                      type="button"
                      @click.stop="toggleStepMenu(step.id)"
                    >
                      ⋯
                    </button>

                    <div
                      v-if="stepMenuOpenId === step.id"
                      class="step-card__menu"
                      @click.stop
                    >
                      <button
                        type="button"
                        @click="insertStepRelative(step, 'before')"
                      >
                        Insert above
                      </button>
                      <button
                        type="button"
                        @click="insertStepRelative(step, 'after')"
                      >
                        Insert below
                      </button>
                      <button
                        type="button"
                        :disabled="steps[0]?.id === step.id"
                        @click="moveStepCard(step, 'up')"
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        :disabled="steps[steps.length - 1]?.id === step.id"
                        @click="moveStepCard(step, 'down')"
                      >
                        Move down
                      </button>
                      <button type="button" @click="duplicateStepCard(step)">
                        Duplicate
                      </button>
                      <button
                        class="step-card__menu-danger"
                        type="button"
                        @click="removeStepCard(step)"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                <div class="step-card__meta">
                  <span>{{ step.kind }}</span>
                  <span>{{ step.annotations?.length ?? 0 }} marks</span>
                </div>
              </div>
            </button>
          </div>

          <div v-else class="steps-empty">
            <strong>No steps yet</strong>
            <span>先从截图、导入图片或空白步骤开始。</span>
          </div>
        </template>

        <div
          v-if="!leftCollapsed"
          class="panel-resizer panel-resizer--left"
          @pointerdown.prevent="beginResize('left', $event)"
        ></div>
      </aside>

      <nav class="tools-rail" aria-label="Annotation tools">
        <button
          v-for="tool in TOOL_OPTIONS"
          :key="tool.id"
          type="button"
          class="rail-tool"
          :class="{ 'rail-tool--active': activeTool === tool.id }"
          :title="tool.hint"
          :disabled="!selectedStep?.asset"
          @click="setActiveTool(tool.id)"
        >
          <span>{{ tool.icon }}</span>
        </button>
      </nav>

      <main class="workspace-column">
        <div class="workspace-toolbar">
          <div class="workspace-toolbar__group">
            <div class="image-actions-menu-wrap">
              <button
                class="toolbar-button"
                type="button"
                @click="imageActionsMenuOpen = !imageActionsMenuOpen"
              >
                Step image actions
              </button>

              <div v-if="imageActionsMenuOpen" class="toolbar-menu" @click.stop>
                <button type="button" @click="runStepImageAction('capture')">
                  Capture current screen
                </button>
                <button
                  type="button"
                  @click="runStepImageAction('capture-area')"
                >
                  Capture selected area
                </button>
                <button type="button" @click="runStepImageAction('import')">
                  Import images as steps
                </button>
                <button
                  type="button"
                  :disabled="!selectedStepAsset"
                  @click="runStepImageAction('reveal')"
                >
                  Open current screenshot
                </button>
                <button
                  type="button"
                  :disabled="!canRestoreCroppedAsset"
                  @click="restoreSelectedStepCrop()"
                >
                  Undo crop
                </button>
              </div>
            </div>

            <button
              class="toolbar-button"
              type="button"
              :disabled="!selectedStepAsset"
              @click="exportSelectedImage()"
            >
              Export image
            </button>
            <button
              v-if="canRestoreCroppedAsset"
              class="toolbar-button"
              type="button"
              :title="`${cropUndoCount} crop step${cropUndoCount === 1 ? '' : 's'} available`"
              @click="restoreSelectedStepCrop()"
            >
              Undo crop
            </button>
          </div>

          <div class="workspace-toolbar__group workspace-toolbar__group--right">
            <div class="workspace-save-message">
              {{ workbench.saveMessage }}
            </div>
            <button
              class="focused-pill"
              type="button"
              @click="toggleFocusedView()"
            >
              <span
                class="focused-pill__dot"
                :class="{ 'focused-pill__dot--off': !focusedViewEnabled }"
              ></span>
              <span>Focused view</span>
            </button>
            <button
              class="toolbar-button toolbar-button--danger"
              type="button"
              :disabled="!selectedAnnotation"
              @click="removeSelectedAnnotation()"
            >
              Delete annotation
            </button>
          </div>
        </div>

        <div class="workspace-meta">
          <div class="workspace-meta__left">
            <strong>{{
              clickStreamActive
                ? `Click capture ${workbench.clickStreamStatus}`
                : activeToolMeta.label
            }}</strong>
            <span>{{
              clickStreamActive ? clickProgressText : activeToolMeta.hint
            }}</span>
          </div>

          <div class="workspace-meta__right">
            <span>{{ annotationCount }} annotations</span>
            <span v-if="selectedAnnotation">{{ selectedAnnotationLabel }}</span>
          </div>
        </div>

        <div ref="stageViewportRef" class="stage-viewport">
          <div v-if="!hasSteps" class="start-panel">
            <div class="start-panel__title">Create your guide</div>
            <div class="start-grid">
              <button
                v-for="option in START_OPTIONS"
                :key="option.id"
                type="button"
                class="start-card"
                @click="runAddStepAction(option.id)"
              >
                <strong>{{ option.title }}</strong>
                <span>{{ option.description }}</span>
              </button>
            </div>
          </div>

          <div v-else class="stage-scroll">
            <div class="stage-center">
              <div class="stage-shell">
                <div class="stage-controls">
                  <button
                    class="stage-controls__toggle"
                    type="button"
                    :class="{
                      'stage-controls__toggle--active': focusedViewEnabled,
                    }"
                    @click="toggleFocusedView()"
                  >
                    Focused view
                  </button>

                  <div class="stage-controls__meta">
                    <button
                      class="stage-controls__icon"
                      type="button"
                      @click="nudgeZoom('out')"
                    >
                      −
                    </button>
                    <button
                      class="stage-controls__button"
                      type="button"
                      @click="setZoomPreset('fit')"
                    >
                      Auto fit
                    </button>
                    <span>{{ zoomLabel }}</span>
                    <button
                      class="stage-controls__icon"
                      type="button"
                      @click="nudgeZoom('in')"
                    >
                      ＋
                    </button>
                  </div>
                </div>

                <div
                  class="stage-surface"
                  :class="{ 'stage-surface--focused': focusedViewEnabled }"
                >
                  <ScreenshotAnnotator
                    v-if="selectedStep?.asset"
                    :image-src="selectedStepAssetUrl"
                    :image-alt="selectedStep.title"
                    :image-width="selectedStep.asset.width"
                    :image-height="selectedStep.asset.height"
                    :zoom="resolvedZoom"
                    :annotations="selectedStep.annotations ?? []"
                    :active-tool="activeTool === 'ocr' ? 'select' : activeTool"
                    @update:annotations="updateSelectedAnnotations"
                    @update:selected-id="selectedAnnotationId = $event"
                    @update:active-tool="activeTool = $event"
                    @request:crop="handleCropRequest"
                  />

                  <div v-else class="stage-empty">
                    <strong>{{
                      selectedStep?.kind === 'content'
                        ? 'Content block selected'
                        : 'No screenshot yet'
                    }}</strong>
                    <span>
                      {{
                        selectedStep?.kind === 'content'
                          ? '这个步骤当前是纯文本内容块。'
                          : '为这个步骤抓图或导入图片后，中间画布才会显示。'
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="workbench.ocrEnabled" class="ocr-footer">
          <div class="ocr-footer__message">
            <strong>OCR</strong>
            <span>
              {{
                workbench.ocrBusy
                  ? '识别进行中，首次加载语言包会慢一些。'
                  : '提取当前截图文字，并自动复制结果到剪贴板。'
              }}
            </span>
          </div>

          <div class="ocr-footer__controls">
            <select
              class="ocr-footer__select"
              :value="workbench.ocrLanguage"
              @change="
                workbench.setOcrLanguage(
                  ($event.target as HTMLSelectElement).value
                )
              "
            >
              <option
                v-for="language in workbench.ocrLanguageOptions"
                :key="language.code"
                :value="language.code"
              >
                {{ language.label }}
              </option>
            </select>

            <button
              class="secondary-button"
              type="button"
              :disabled="!selectedStep?.asset || workbench.ocrBusy"
              @click="runFullStepOcr()"
            >
              {{ workbench.ocrBusy ? 'Recognizing...' : 'Recognize full step' }}
            </button>
            <button
              class="secondary-button"
              type="button"
              :disabled="
                !selectedStep?.asset ||
                !selectedAnnotationSelection ||
                workbench.ocrBusy
              "
              @click="runSelectedAreaOcr()"
            >
              Recognize selected area
            </button>
            <button
              class="secondary-button"
              type="button"
              :disabled="!workbench.ocrResult?.text"
              @click="workbench.copyOcrResult()"
            >
              Copy last result
            </button>
            <button
              class="chrome-icon-button"
              type="button"
              @click="workbench.toggleOcr(false)"
            >
              ✕
            </button>
          </div>

          <div class="ocr-footer__result">
            <div class="ocr-footer__result-meta">
              <span v-if="workbench.ocrResult?.confidence">
                Confidence {{ Math.round(workbench.ocrResult.confidence) }}%
              </span>
              <span v-if="workbench.ocrResult?.selection">Selected area</span>
              <span v-if="workbench.ocrError">{{ workbench.ocrError }}</span>
            </div>
            <textarea
              readonly
              :value="workbench.ocrResult?.text ?? ''"
              placeholder="OCR result will appear here."
            />
          </div>
        </div>
      </main>

      <aside
        class="details-panel"
        :class="{ 'details-panel--collapsed': rightCollapsed }"
      >
        <button
          v-if="rightCollapsed"
          class="panel-edge-toggle panel-edge-toggle--right"
          type="button"
          @click="rightCollapsed = false"
        >
          ‹
        </button>

        <template v-else>
          <div class="panel-header">
            <div>
              <strong>{{
                selectedStep ? 'Step Details' : 'Guide Details'
              }}</strong>
              <p>{{ selectedStep ? stepCounterLabel : 'Guide settings' }}</p>
            </div>

            <button
              class="collapse-trigger"
              type="button"
              @click="rightCollapsed = true"
            >
              ›
            </button>
          </div>

          <div v-if="selectedStep" class="details-body">
            <div class="details-body__hero">
              <button class="details-settings-button" type="button">
                Step settings
              </button>
              <span>{{ stepCounterLabel }}</span>
            </div>

            <section v-if="selectedAnnotation" class="detail-section">
              <div class="detail-section__title">Annotation</div>

              <div class="annotation-card">
                <div class="annotation-card__head">
                  <strong>{{ selectedAnnotationLabel }}</strong>
                  <span>{{ selectedAnnotation.id.slice(-6) }}</span>
                </div>

                <label v-if="annotationSupportsText" class="field">
                  <span>Text</span>
                  <textarea
                    rows="3"
                    :value="selectedAnnotation.text ?? ''"
                    @input="
                      updateSelectedAnnotationPatch({
                        text: ($event.target as HTMLTextAreaElement).value,
                      })
                    "
                  />
                </label>

                <div class="annotation-grid">
                  <label class="field">
                    <span>Stroke color</span>
                    <input
                      type="color"
                      :value="selectedAnnotation.color ?? '#f2b91f'"
                      @input="
                        updateSelectedAnnotationPatch({
                          color: ($event.target as HTMLInputElement).value,
                        })
                      "
                    />
                  </label>

                  <label v-if="annotationSupportsLine" class="field">
                    <span>Stroke width</span>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      :value="selectedAnnotation.strokeWidth ?? 3"
                      @input="
                        updateSelectedAnnotationNumberField(
                          'strokeWidth',
                          ($event.target as HTMLInputElement).value
                        )
                      "
                    />
                  </label>

                  <label v-if="annotationSupportsFill" class="field">
                    <span>Fill color</span>
                    <input
                      type="color"
                      :value="
                        selectedAnnotation.fillColor?.startsWith('#')
                          ? selectedAnnotation.fillColor
                          : '#f2b91f'
                      "
                      @input="
                        updateSelectedAnnotationPatch({
                          fillColor: ($event.target as HTMLInputElement).value,
                        })
                      "
                    />
                  </label>

                  <label v-if="annotationSupportsOpacity" class="field">
                    <span>Opacity</span>
                    <input
                      type="number"
                      min="0.05"
                      max="1"
                      step="0.05"
                      :value="selectedAnnotation.opacity ?? 1"
                      @input="
                        updateSelectedAnnotationNumberField(
                          'opacity',
                          ($event.target as HTMLInputElement).value
                        )
                      "
                    />
                  </label>

                  <label v-if="annotationSupportsText" class="field">
                    <span>Text color</span>
                    <input
                      type="color"
                      :value="selectedAnnotation.textColor ?? '#ffffff'"
                      @input="
                        updateSelectedAnnotationPatch({
                          textColor: ($event.target as HTMLInputElement).value,
                        })
                      "
                    />
                  </label>

                  <label v-if="annotationSupportsText" class="field">
                    <span>Font size</span>
                    <input
                      type="number"
                      min="10"
                      max="64"
                      :value="selectedAnnotation.fontSize ?? 16"
                      @input="
                        updateSelectedAnnotationNumberField(
                          'fontSize',
                          ($event.target as HTMLInputElement).value
                        )
                      "
                    />
                  </label>

                  <label v-if="annotationSupportsText" class="field">
                    <span>Font weight</span>
                    <select
                      :value="selectedAnnotation.fontWeight ?? 700"
                      @change="
                        updateSelectedAnnotationNumberField(
                          'fontWeight',
                          ($event.target as HTMLSelectElement).value
                        )
                      "
                    >
                      <option value="400">Regular</option>
                      <option value="500">Medium</option>
                      <option value="600">Semibold</option>
                      <option value="700">Bold</option>
                    </select>
                  </label>

                  <label v-if="annotationSupportsText" class="field">
                    <span>Text align</span>
                    <select
                      :value="selectedAnnotation.textAlign ?? 'left'"
                      @change="
                        updateSelectedAnnotationPatch({
                          textAlign: ($event.target as HTMLSelectElement)
                            .value as 'left' | 'center' | 'right',
                        })
                      "
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>

                  <label
                    v-if="
                      selectedAnnotation.type !== 'click' &&
                      selectedAnnotation.type !== 'line' &&
                      selectedAnnotation.type !== 'arrow' &&
                      selectedAnnotation.type !== 'brush'
                    "
                    class="field"
                  >
                    <span>Radius</span>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      :value="selectedAnnotation.radius ?? 10"
                      @input="
                        updateSelectedAnnotationNumberField(
                          'radius',
                          ($event.target as HTMLInputElement).value
                        )
                      "
                    />
                  </label>

                  <label
                    v-if="selectedAnnotation.type === 'magnify'"
                    class="field"
                  >
                    <span>Zoom</span>
                    <input
                      type="number"
                      min="1.2"
                      max="4"
                      step="0.1"
                      :value="selectedAnnotation.magnifyZoom ?? 1.8"
                      @input="
                        updateSelectedAnnotationNumberField(
                          'magnifyZoom',
                          ($event.target as HTMLInputElement).value
                        )
                      "
                    />
                  </label>

                  <label
                    v-if="selectedAnnotation.type === 'blur'"
                    class="field"
                  >
                    <span>Blur amount</span>
                    <input
                      type="number"
                      min="2"
                      max="30"
                      :value="selectedAnnotation.blurAmount ?? 12"
                      @input="
                        updateSelectedAnnotationNumberField(
                          'blurAmount',
                          ($event.target as HTMLInputElement).value
                        )
                      "
                    />
                  </label>

                  <label
                    v-if="
                      selectedAnnotation.type === 'cursor' ||
                      selectedAnnotation.type === 'click'
                    "
                    class="field"
                  >
                    <span>Cursor</span>
                    <select
                      :value="selectedAnnotation.cursorVariant ?? 'pointer'"
                      @change="
                        updateSelectedAnnotationPatch({
                          cursorVariant: ($event.target as HTMLSelectElement)
                            .value as AnnotationCursorVariant,
                        })
                      "
                    >
                      <option
                        v-for="variant in CURSOR_VARIANTS"
                        :key="variant.value"
                        :value="variant.value"
                      >
                        {{ variant.label }}
                      </option>
                    </select>
                  </label>

                  <label
                    v-if="selectedAnnotation.type === 'tooltip'"
                    class="field"
                  >
                    <span>Placement</span>
                    <select
                      :value="selectedAnnotation.tooltipPlacement ?? 'bottom'"
                      @change="
                        updateSelectedAnnotationPatch({
                          tooltipPlacement: ($event.target as HTMLSelectElement)
                            .value as AnnotationTooltipPlacement,
                        })
                      "
                    >
                      <option
                        v-for="placement in TOOLTIP_PLACEMENTS"
                        :key="placement.value"
                        :value="placement.value"
                      >
                        {{ placement.label }}
                      </option>
                    </select>
                  </label>

                  <label
                    v-if="
                      selectedAnnotation.type === 'line' ||
                      selectedAnnotation.type === 'arrow' ||
                      selectedAnnotation.type === 'brush'
                    "
                    class="field"
                  >
                    <span>Line style</span>
                    <select
                      :value="selectedAnnotation.lineStyle ?? 'solid'"
                      @change="
                        updateSelectedAnnotationPatch({
                          lineStyle: ($event.target as HTMLSelectElement)
                            .value as AnnotationLineStyle,
                        })
                      "
                    >
                      <option
                        v-for="style in LINE_STYLE_OPTIONS"
                        :key="style.value"
                        :value="style.value"
                      >
                        {{ style.label }}
                      </option>
                    </select>
                  </label>

                  <label v-if="annotationSupportsShadow" class="field">
                    <span>Shadow</span>
                    <select
                      :value="
                        selectedAnnotation.shadow === false ? 'off' : 'on'
                      "
                      @change="
                        updateSelectedAnnotationPatch({
                          shadow:
                            ($event.target as HTMLSelectElement).value === 'on',
                        })
                      "
                    >
                      <option value="on">On</option>
                      <option value="off">Off</option>
                    </select>
                  </label>
                </div>

                <div class="annotation-swatches">
                  <button
                    v-for="color in COLOR_PRESETS"
                    :key="`stroke-${color}`"
                    type="button"
                    class="annotation-swatch"
                    :style="{ background: color }"
                    @click="applyAnnotationPreset('color', color)"
                  ></button>
                </div>

                <div v-if="annotationSupportsFill" class="annotation-swatches">
                  <button
                    v-for="fill in FILL_PRESETS"
                    :key="`fill-${fill}`"
                    type="button"
                    class="annotation-swatch annotation-swatch--fill"
                    :style="{ background: fill }"
                    @click="applyAnnotationPreset('fillColor', fill)"
                  ></button>
                </div>

                <div
                  v-if="annotationSupportsArrowHeads"
                  class="annotation-toggle-grid"
                >
                  <label class="toggle-row">
                    <input
                      type="checkbox"
                      :checked="selectedAnnotation.showArrowHeadStart ?? false"
                      @change="
                        updateSelectedAnnotationPatch({
                          showArrowHeadStart: (
                            $event.target as HTMLInputElement
                          ).checked,
                        })
                      "
                    />
                    <span>Arrow head at start</span>
                  </label>
                  <label class="toggle-row">
                    <input
                      type="checkbox"
                      :checked="
                        selectedAnnotation.showArrowHeadEnd ??
                        selectedAnnotation.type === 'arrow'
                      "
                      @change="
                        updateSelectedAnnotationPatch({
                          showArrowHeadEnd: ($event.target as HTMLInputElement)
                            .checked,
                        })
                      "
                    />
                    <span>Arrow head at end</span>
                  </label>
                </div>

                <div class="annotation-layer-actions">
                  <button
                    class="secondary-button"
                    type="button"
                    @click="moveSelectedAnnotationLayer('back')"
                  >
                    Send to back
                  </button>
                  <button
                    class="secondary-button"
                    type="button"
                    @click="moveSelectedAnnotationLayer('backward')"
                  >
                    Send backward
                  </button>
                  <button
                    class="secondary-button"
                    type="button"
                    @click="moveSelectedAnnotationLayer('forward')"
                  >
                    Bring forward
                  </button>
                  <button
                    class="secondary-button"
                    type="button"
                    @click="moveSelectedAnnotationLayer('front')"
                  >
                    Bring to front
                  </button>
                </div>
              </div>
            </section>

            <section class="detail-section">
              <div class="detail-section__title">Step settings</div>

              <label class="field">
                <span>Status</span>
                <select
                  :value="selectedStep.status ?? 'default'"
                  @change="
                    updateSelectedStep({
                      status: ($event.target as HTMLSelectElement)
                        .value as StepStatus,
                    })
                  "
                >
                  <option value="default">Default</option>
                  <option value="completed">Completed</option>
                  <option value="skipped">Skipped</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>

              <label class="field">
                <span>Step type</span>
                <select
                  :value="selectedStep.kind"
                  @change="
                    updateSelectedStep({
                      kind: ($event.target as HTMLSelectElement)
                        .value as StepDraft['kind'],
                    })
                  "
                >
                  <option value="action">Action</option>
                  <option value="note">Note</option>
                  <option value="section">Section</option>
                  <option value="content">Content block</option>
                </select>
              </label>
            </section>

            <section class="detail-section">
              <div class="detail-section__title">Title</div>
              <label class="field">
                <input
                  :value="selectedStep.title"
                  @input="
                    updateSelectedStep({
                      title: ($event.target as HTMLInputElement).value,
                    })
                  "
                />
              </label>
            </section>

            <section class="detail-section">
              <div class="detail-section__title">Description</div>
              <RichTextEditor
                :model-value="selectedStep.notesHtml ?? ''"
                placeholder="Describe the operator action, expected result, checks, and notes."
                @update:model-value="updateSelectedStep({ notesHtml: $event })"
              />
            </section>

            <section class="detail-section detail-section--toggles">
              <label class="toggle-row">
                <input
                  type="checkbox"
                  :checked="selectedStep.settings?.forceNewPage ?? false"
                  @change="
                    updateSelectedStep({
                      settings: {
                        ...getCompleteStepSettings(selectedStep),
                        forceNewPage: ($event.target as HTMLInputElement)
                          .checked,
                      },
                    })
                  "
                />
                <span>Force new page</span>
              </label>

              <label class="toggle-row">
                <input
                  type="checkbox"
                  :checked="selectedStep.settings?.showStepNumber ?? true"
                  @change="
                    updateSelectedStep({
                      settings: {
                        ...getCompleteStepSettings(selectedStep),
                        showStepNumber: ($event.target as HTMLInputElement)
                          .checked,
                      },
                    })
                  "
                />
                <span>Show step number</span>
              </label>
            </section>

            <section class="detail-actions">
              <button
                class="secondary-button"
                type="button"
                :disabled="!canMoveStepUp"
                @click="moveSelectedStep('up')"
              >
                Move Up
              </button>
              <button
                class="secondary-button"
                type="button"
                :disabled="!canMoveStepDown"
                @click="moveSelectedStep('down')"
              >
                Move Down
              </button>
              <button
                class="secondary-button"
                type="button"
                @click="duplicateSelectedStep()"
              >
                Duplicate
              </button>
              <button
                class="danger-button"
                type="button"
                @click="removeSelectedStep()"
              >
                Delete
              </button>
            </section>
          </div>

          <div v-else class="details-body">
            <section class="detail-section">
              <div class="detail-section__title">Guide name</div>
              <label class="field">
                <input
                  :value="currentProject.name"
                  @input="
                    workbench.updateProjectMeta({
                      name: ($event.target as HTMLInputElement).value,
                    })
                  "
                />
              </label>
            </section>

            <section class="detail-section">
              <div class="detail-section__title">Description</div>
              <label class="field">
                <textarea
                  rows="6"
                  :value="currentProject.description"
                  @input="
                    workbench.updateProjectMeta({
                      description: ($event.target as HTMLTextAreaElement).value,
                    })
                  "
                />
              </label>
            </section>
          </div>
        </template>

        <div
          v-if="!rightCollapsed"
          class="panel-resizer panel-resizer--right"
          @pointerdown.prevent="beginResize('right', $event)"
        ></div>
      </aside>
    </section>

    <CropAdjustDialog
      v-if="cropDialogStep && cropDialogAsset && cropDialogSelection"
      :image-src="selectedStepAssetUrl"
      :image-alt="cropDialogStep.title"
      :image-width="cropDialogAsset.width"
      :image-height="cropDialogAsset.height"
      :initial-selection="cropDialogSelection"
      @apply="applyCropDialog"
      @cancel="cancelCropDialog"
    />

    <div
      v-if="previewOpen"
      class="preview-overlay"
      @click.self="previewOpen = false"
    >
      <section class="preview-dialog">
        <header class="preview-dialog__header">
          <div>
            <strong>HTML Preview</strong>
            <p>{{ currentProject.name }}</p>
          </div>

          <div class="preview-dialog__actions">
            <button
              class="secondary-button"
              type="button"
              @click="saveCurrentProject()"
            >
              Save
            </button>
            <button
              class="secondary-button"
              type="button"
              @click="exportCurrentProject()"
            >
              Export HTML
            </button>
            <button
              class="secondary-button"
              type="button"
              :disabled="!workbench.lastExportResult"
              @click="openLastExport()"
            >
              Open last export
            </button>
            <button
              class="chrome-icon-button"
              type="button"
              @click="previewOpen = false"
            >
              ✕
            </button>
          </div>
        </header>

        <div class="preview-dialog__body">
          <iframe
            class="preview-dialog__frame"
            :srcdoc="workbench.previewHtml"
          ></iframe>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.editor-page {
  height: 100%;
  background: linear-gradient(
      180deg,
      rgba(248, 210, 100, 0.48) 0,
      rgba(248, 210, 100, 0.48) 30px,
      #f6f7f9 30px
    ),
    #f6f7f9;
  color: #2b3139;
  display: grid;
  grid-template-rows: 40px minmax(0, 1fr);
  overflow: hidden;
}

.editor-topbar {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 380px;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  background: #ffffff;
  border-bottom: 1px solid #dfe3e8;
}

.editor-topbar--intro {
  grid-template-columns: 180px minmax(0, 1fr) 120px;
}

.topbar-left,
.topbar-center,
.topbar-right {
  min-width: 0;
}

.menu-trigger,
.chrome-icon-button,
.topbar-save-button,
.export-button,
.zoom-button,
.status-button,
.toolbar-button,
.focused-pill,
.add-step-button,
.ghost-icon-button,
.collapse-trigger,
.secondary-button,
.danger-button,
.rail-tool,
.panel-edge-toggle {
  appearance: none;
  border: 1px solid #d4d8df;
  background: #fff;
  color: #2f3640;
  font: inherit;
}

.menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  padding: 0 6px;
  height: 30px;
}

.menu-trigger__icon {
  font-size: 16px;
}

.topbar-center {
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.topbar-title-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.topbar-title {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-subtitle {
  margin-top: 2px;
  color: #8b93a1;
  font-size: 10px;
}

.topbar-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.chrome-icon-button,
.topbar-save-button,
.zoom-button,
.status-button,
.export-button {
  height: 30px;
  border-radius: 6px;
}

.chrome-icon-button {
  width: 32px;
  padding: 0;
}

.status-button,
.zoom-button {
  padding: 0 12px;
}

.topbar-save-button {
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-button {
  color: #916200;
  background: #fff7da;
  border-color: #edcf76;
  font-weight: 600;
}

.export-button {
  padding: 0 14px;
  color: #fff;
  background: #4fb75f;
  border-color: #43a953;
  font-weight: 700;
}

.export-split {
  position: relative;
  display: inline-flex;
}

.export-button--primary {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.export-button--toggle {
  min-width: 32px;
  padding: 0 10px;
  border-left-color: rgba(255, 255, 255, 0.28);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.export-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 24;
  width: 180px;
  padding: 8px;
  border: 1px solid #d6dae1;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(31, 39, 51, 0.1);
  display: grid;
  gap: 4px;
}

.export-menu button {
  height: 34px;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #404855;
  font: inherit;
  text-align: left;
}

.export-menu button:hover:not(:disabled) {
  background: #f2f5f8;
}

.export-menu button:disabled {
  opacity: 0.52;
}

.zoom-control {
  position: relative;
}

.zoom-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 78px;
  justify-content: space-between;
}

.zoom-button__arrow {
  color: #9098a5;
  font-size: 11px;
}

.zoom-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  width: 172px;
  padding: 8px;
  border: 1px solid #d6dae1;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(31, 39, 51, 0.1);
  display: grid;
  gap: 4px;
}

.zoom-option {
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #404855;
  font: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.zoom-option--active {
  background: #f2f5f8;
  color: #1d2430;
  font-weight: 700;
}

.avatar-chip {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f6c84a;
  border: 1px solid #efc248;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(23, 29, 38, 0.2);
}

.menu-drawer {
  width: 280px;
  height: 100%;
  padding: 16px;
  background: #fff;
  border-right: 1px solid #d8dce3;
  box-shadow: 12px 0 28px rgba(25, 33, 44, 0.1);
  display: grid;
  align-content: start;
  gap: 16px;
}

.menu-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menu-drawer__group {
  display: grid;
  gap: 8px;
}

.menu-drawer__group--muted .menu-item {
  opacity: 0.56;
}

.menu-item {
  height: 36px;
  padding: 0 12px;
  text-align: left;
  border: 1px solid #d7dbe2;
  border-radius: 6px;
  background: #fff;
  color: inherit;
  font: inherit;
}

.menu-item--accent {
  color: #1e7f37;
  background: #edf9f0;
  border-color: #cde7d3;
  font-weight: 700;
}

.menu-drawer__footer {
  padding: 12px;
  border-radius: 12px;
  background: #f5f7fa;
  color: #6e7785;
  font-size: 12px;
  display: grid;
  gap: 6px;
}

.editor-body {
  min-height: 0;
  display: grid;
  grid-template-columns: var(--steps-width) 54px minmax(0, 1fr) var(
      --details-width
    );
  overflow: hidden;
}

.guide-intro {
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 32px 20px 56px;
}

.guide-intro__content {
  width: min(640px, calc(100vw - 48px));
  display: grid;
  justify-items: center;
  gap: 18px;
  text-align: center;
}

.guide-intro__symbol {
  font-size: 68px;
  line-height: 1;
}

.guide-intro__content h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  color: #2d3340;
}

.guide-intro__name {
  width: min(420px, 100%);
  height: 38px;
  padding: 0 12px;
  border: 1px solid #d9dee5;
  border-radius: 4px;
  background: #ffffff;
  color: #38404b;
  text-align: left;
  font: inherit;
  font-size: 15px;
}

.guide-intro__status {
  margin: 8px 0 0;
  color: #49515f;
  font-size: 14px;
}

.guide-intro__status--warning {
  color: #946d1a;
}

.guide-intro__status--danger {
  color: #b24d4d;
}

.guide-intro__status--active {
  color: #2e7d44;
}

.guide-intro__actions {
  width: min(360px, 100%);
  display: grid;
  gap: 14px;
  margin-top: 6px;
}

.guide-intro__action {
  height: 36px;
  border: none;
  border-radius: 4px;
  background: #7f868d;
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.guide-intro__action:hover:not(:disabled) {
  background: #727980;
}

.guide-intro__action:disabled {
  opacity: 0.6;
}

.guide-intro__footer {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.steps-panel,
.details-panel,
.tools-rail,
.workspace-column {
  min-height: 0;
}

.steps-panel,
.details-panel {
  background: #fff;
}

.steps-panel {
  border-right: 1px solid #d9dde4;
  overflow: hidden;
  position: relative;
}

.steps-panel--collapsed {
  border-right: 1px solid #d9dde4;
  background: #f7f8fa;
  display: grid;
  place-items: center;
}

.details-panel {
  border-left: 1px solid #d9dde4;
  overflow: hidden;
  position: relative;
}

.details-panel--collapsed {
  border-left: 1px solid #d9dde4;
  background: #f7f8fa;
  display: grid;
  place-items: center;
}

.panel-edge-toggle {
  width: 100%;
  height: 76px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #99a2af;
  font-size: 18px;
}

.panel-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  z-index: 8;
  cursor: col-resize;
}

.panel-resizer--left {
  right: -5px;
}

.panel-resizer--right {
  left: -5px;
}

.panel-header {
  height: 48px;
  padding: 0 14px;
  border-bottom: 1px solid #e4e7ec;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
}

.panel-header p {
  margin: 2px 0 0;
  color: #8c95a3;
  font-size: 11px;
}

.panel-header--steps {
  gap: 12px;
}

.steps-header-icons {
  display: flex;
  gap: 8px;
}

.steps-view-toggle {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #939baa;
  font: inherit;
  font-size: 12px;
  display: grid;
  place-items: center;
}

.steps-view-toggle--active {
  background: #f2f5f8;
  color: #495463;
}

.steps-header-title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.steps-header-title strong {
  font-size: 13px;
}

.steps-header-title span {
  color: #97a0ad;
  font-size: 12px;
}

.collapse-trigger,
.ghost-icon-button {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  padding: 0;
}

.steps-actions {
  position: relative;
  padding: 10px 10px;
  display: flex;
  gap: 8px;
  align-items: center;
  border-bottom: 1px solid #eceff3;
}

.add-step-button {
  flex: 1;
  height: 34px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #2fa74b;
  font-size: 12px;
  font-weight: 700;
  background: #ffffff;
  border-color: #67bd79;
}

.add-step-menu {
  position: absolute;
  left: 12px;
  right: 12px;
  top: calc(100% - 2px);
  z-index: 15;
  padding: 8px;
  border: 1px solid #d8dce3;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(31, 39, 51, 0.1);
  display: grid;
  gap: 4px;
}

.add-step-menu button {
  height: 34px;
  padding: 0 10px;
  text-align: left;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #42505d;
  font: inherit;
}

.add-step-menu button:hover,
.zoom-option:hover,
.menu-item:hover,
.toolbar-button:hover,
.rail-tool:hover,
.ghost-icon-button:hover,
.step-card__menu-button:hover,
.collapse-trigger:hover,
.secondary-button:hover,
.danger-button:hover,
.panel-edge-toggle:hover,
.chrome-icon-button:hover,
.topbar-save-button:hover,
.zoom-button:hover,
.status-button:hover,
.add-step-button:hover,
.menu-trigger:hover {
  background: #f3f5f8;
}

.export-button:hover {
  background: #1ea33f;
}

.steps-list {
  height: calc(100% - 48px - 55px);
  padding: 10px;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 8px;
  background: #ffffff;
}

.steps-empty {
  padding: 18px 16px;
  color: #7d8795;
  display: grid;
  gap: 6px;
}

.step-card {
  border: 1px solid #dce1e8;
  border-radius: 8px;
  padding: 8px;
  background: #fff;
  text-align: left;
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 10px;
}

.step-card--compact {
  grid-template-columns: minmax(0, 1fr);
}

.step-card--active {
  border-color: #efcf76;
  box-shadow: inset 0 0 0 1px #efcf76;
  background: #fffdf6;
}

.step-card__thumb {
  position: relative;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  background: #edf0f4;
}

.step-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.step-card__thumb-empty {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #8a93a1;
  font-size: 11px;
}

.step-card__badge,
.step-card__click {
  position: absolute;
  top: 6px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.step-card__badge {
  left: 6px;
  color: #fff;
  background: #e39a17;
}

.step-card__click {
  right: 6px;
  color: #8b5c00;
  background: rgba(255, 245, 212, 0.96);
}

.step-card__body {
  min-width: 0;
  align-self: center;
}

.step-card__title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.step-card__title-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.step-card__title {
  flex: 1;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 700;
  color: #2b3440;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.step-card__inline-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #e39a17;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.step-card__meta {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #8f98a5;
  font-size: 11px;
}

.step-card__menu-wrap {
  position: relative;
  flex: none;
}

.step-card__menu-button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #8e97a4;
  font: inherit;
  line-height: 1;
}

.step-card__menu,
.toolbar-menu {
  position: absolute;
  z-index: 20;
  min-width: 166px;
  padding: 8px;
  border: 1px solid #d9dde4;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(33, 41, 54, 0.1);
  display: grid;
  gap: 4px;
}

.step-card__menu {
  top: calc(100% + 6px);
  right: 0;
}

.step-card__menu button,
.toolbar-menu button {
  height: 32px;
  padding: 0 10px;
  text-align: left;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #3d4755;
  font: inherit;
}

.step-card__menu button:hover,
.toolbar-menu button:hover {
  background: #f3f5f8;
}

.step-card__menu-danger {
  color: #a04a4a !important;
}

.tools-rail {
  border-right: 1px solid #d9dde4;
  background: #ffffff;
  padding: 10px 6px;
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 8px;
  overflow: auto;
}

.rail-tool {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  padding: 0;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
}

.rail-tool--active {
  border-color: #efcf76;
  background: #fff7dd;
  color: #7c5a0b;
}

.workspace-column {
  display: grid;
  grid-template-rows: 56px 34px minmax(0, 1fr) auto;
  background: #f3f5f7;
  overflow: hidden;
}

.workspace-toolbar {
  padding: 10px 14px 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workspace-toolbar__group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.workspace-toolbar__group--right {
  margin-left: auto;
}

.workspace-save-message {
  max-width: 260px;
  color: #87909d;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-button {
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 12px;
}

.toolbar-button--danger {
  color: #a54c4c;
}

.image-actions-menu-wrap {
  position: relative;
}

.toolbar-menu {
  top: calc(100% + 8px);
  left: 0;
}

.focused-pill {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #a86200;
  background: #fff6e1;
  border-color: #f0d69a;
  font-size: 12px;
  font-weight: 700;
}

.focused-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f0ab24;
}

.focused-pill__dot--off {
  background: #b1b8c3;
}

.workspace-meta {
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #8a93a1;
  font-size: 11px;
}

.workspace-meta strong {
  color: #303742;
  font-size: 12px;
}

.workspace-meta__left,
.workspace-meta__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stage-viewport {
  min-height: 0;
  overflow: hidden;
  padding: 0 12px 12px;
}

.ocr-footer {
  margin: 0 12px 12px;
  padding: 12px;
  border: 1px solid #d8dce3;
  border-radius: 8px;
  background: #ffffff;
  display: grid;
  gap: 12px;
}

.ocr-footer__message {
  display: grid;
  gap: 4px;
  color: #6f7886;
  font-size: 12px;
}

.ocr-footer__message strong {
  color: #252d38;
  font-size: 13px;
}

.ocr-footer__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ocr-footer__select {
  height: 34px;
  min-width: 168px;
  padding: 0 10px;
  border: 1px solid #d4d8df;
  border-radius: 6px;
  background: #fff;
  color: #2f3640;
  font: inherit;
}

.ocr-footer__result {
  display: grid;
  gap: 8px;
}

.ocr-footer__result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #7c8593;
  font-size: 11px;
}

.ocr-footer__result textarea {
  width: 100%;
  min-height: 92px;
  resize: vertical;
  padding: 12px;
  border: 1px solid #d7dce4;
  border-radius: 8px;
  background: #fff;
  color: #2d3641;
  font: inherit;
  line-height: 1.45;
}

.stage-scroll {
  width: 100%;
  height: 100%;
  overflow: auto;
  border: 1px solid #d8dce3;
  border-radius: 8px;
  background: #eceef1;
}

.stage-center {
  min-width: 100%;
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 34px 30px 30px;
  position: relative;
}

.stage-shell {
  display: grid;
  justify-items: center;
  gap: 14px;
}

.stage-controls {
  min-width: 220px;
  height: 36px;
  padding: 4px;
  border: 1px solid #d7dce4;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 10px 22px rgba(23, 31, 43, 0.08);
}

.stage-controls__toggle,
.stage-controls__button {
  height: 28px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #546172;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 0 12px;
}

.stage-controls__toggle--active {
  color: #8f5d00;
  background: #fff3d3;
}

.stage-controls__meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #798493;
  font-size: 11px;
}

.stage-controls__icon {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: #f4f6f9;
  color: #5a6776;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  display: grid;
  place-items: center;
}

.stage-surface {
  padding: 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #d7dce4;
}

.stage-surface--focused {
  box-shadow: 0 0 0 2px rgba(236, 165, 40, 0.16);
}

.stage-empty {
  min-width: 420px;
  min-height: 240px;
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  color: #7e8896;
}

.start-panel {
  width: 100%;
  height: 100%;
  border: 1px solid #d8dce3;
  border-radius: 8px;
  background: #ffffff;
  padding: 16px;
  overflow: auto;
}

.start-panel__title {
  margin-bottom: 16px;
  color: #333b46;
  font-size: 18px;
  font-weight: 700;
}

.start-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.start-card {
  min-height: 112px;
  padding: 14px;
  border: 1px solid #d8dde5;
  border-radius: 8px;
  background: #fff;
  text-align: left;
}

.start-card strong,
.start-card span {
  display: block;
}

.start-card strong {
  margin-bottom: 6px;
  color: #2f3843;
  font-size: 13px;
}

.start-card span {
  color: #7f8996;
  font-size: 12px;
  line-height: 1.55;
}

.details-body {
  height: calc(100% - 48px);
  padding: 12px;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 14px;
  background: #fff;
}

.details-body__hero {
  display: grid;
  justify-items: start;
  gap: 10px;
}

.details-body__hero span {
  color: #8a93a1;
  font-size: 11px;
}

.details-settings-button {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #b9d2ff;
  border-radius: 8px;
  background: #f7fbff;
  color: #3575e9;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}

.detail-section {
  padding-bottom: 14px;
  border-bottom: 1px solid #edf0f4;
  display: grid;
  gap: 10px;
}

.detail-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-section__title {
  color: #687383;
  font-size: 12px;
  font-weight: 700;
}

.annotation-card {
  display: grid;
  gap: 12px;
}

.annotation-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #6b7584;
  font-size: 11px;
}

.annotation-card__head strong {
  color: #2e3641;
  font-size: 13px;
}

.annotation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.annotation-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.annotation-swatch {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(18, 24, 31, 0.1);
  border-radius: 50%;
  padding: 0;
}

.annotation-swatch--fill {
  border-radius: 8px;
}

.annotation-toggle-grid {
  display: grid;
  gap: 8px;
}

.annotation-layer-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  color: #5f6a79;
  font-size: 12px;
  font-weight: 600;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid #d7dce4;
  border-radius: 6px;
  background: #fff;
  color: inherit;
  font: inherit;
  padding: 10px 12px;
}

.field textarea {
  resize: vertical;
}

.detail-section--toggles {
  gap: 8px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4f5968;
  font-size: 12px;
}

.detail-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(25, 33, 43, 0.34);
  display: grid;
  place-items: center;
  padding: 28px;
}

.preview-dialog {
  width: min(1320px, calc(100vw - 56px));
  height: min(860px, calc(100vh - 56px));
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 36px rgba(17, 25, 38, 0.16);
  display: grid;
  grid-template-rows: 68px minmax(0, 1fr);
  overflow: hidden;
}

.preview-dialog__header {
  padding: 0 16px 0 18px;
  border-bottom: 1px solid #e6e9ef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.preview-dialog__header p {
  margin: 4px 0 0;
  color: #8d96a3;
  font-size: 12px;
}

.preview-dialog__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-dialog__body {
  min-height: 0;
  background: #f3f5f8;
}

.preview-dialog__frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.secondary-button,
.danger-button {
  height: 36px;
  border-radius: 6px;
}

.danger-button {
  color: #a14a4a;
}

@media (max-width: 1440px) {
  .editor-topbar {
    grid-template-columns: 220px minmax(0, 1fr) 390px;
  }

  .editor-body {
    grid-template-columns: var(--steps-width) 50px minmax(0, 1fr) var(
        --details-width
      );
  }
}

@media (max-width: 1180px) {
  .editor-page {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .editor-topbar {
    grid-template-columns: 1fr;
    padding: 10px 12px;
  }

  .topbar-center {
    text-align: left;
  }

  .topbar-right {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .workspace-toolbar {
    flex-wrap: wrap;
  }

  .workspace-toolbar__group--right {
    margin-left: 0;
    flex-wrap: wrap;
  }

  .editor-body {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
    overflow: auto;
  }

  .steps-panel,
  .details-panel,
  .tools-rail {
    border: none;
  }

  .tools-rail {
    grid-auto-flow: column;
    justify-content: start;
  }

  .stage-empty {
    min-width: 0;
  }

  .preview-dialog {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
  }
}
</style>
