<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { AnnotationCursorVariant, StepAnnotation, StepAnnotationType } from "@shared/contracts";
import {
  CLICK_CURSOR_PATH,
  HAND_CURSOR_PATH,
  TEXT_CURSOR_PATH,
  createAnnotationId,
  getAnnotationBounds,
  normalizeStepAnnotations,
  resizeBrushAnnotation,
  translateBrushAnnotation,
  withUpdatedAnnotationOrder
} from "@shared/step-annotations";

type AnnotationTool = "select" | "crop" | StepAnnotationType;
type ResizeHandle = "nw" | "ne" | "se" | "sw" | "start" | "end";
type AreaAnnotationType =
  | "rect"
  | "ellipse"
  | "text"
  | "blur"
  | "highlight"
  | "magnify"
  | "cursor"
  | "asset"
  | "tooltip";
type LinearAnnotationType = "line" | "arrow" | "brush";

type InteractionState =
  | {
      mode: "draw";
      tool: Exclude<AnnotationTool, "select" | "click">;
      start: { x: number; y: number };
    }
  | {
      mode: "move";
      id: string;
      start: { x: number; y: number };
      original: StepAnnotation;
    }
  | {
      mode: "resize";
      id: string;
      handle: ResizeHandle;
      start: { x: number; y: number };
      original: StepAnnotation;
    };

const props = withDefaults(
  defineProps<{
    imageSrc: string;
    imageAlt?: string;
    imageWidth?: number | null;
    imageHeight?: number | null;
    zoom?: number;
    annotations?: StepAnnotation[] | null;
    activeTool?: AnnotationTool;
  }>(),
  {
    imageAlt: "Step screenshot",
    imageWidth: null,
    imageHeight: null,
    zoom: 100,
    annotations: () => [],
    activeTool: "select"
  }
);

const emit = defineEmits<{
  (event: "update:annotations", value: StepAnnotation[]): void;
  (event: "update:selectedId", value: string | null): void;
  (event: "request:crop", value: { x: number; y: number; width: number; height: number }): void;
}>();

const stageRef = ref<HTMLElement | null>(null);
const naturalWidth = ref(props.imageWidth ?? 1440);
const naturalHeight = ref(props.imageHeight ?? 900);
const workingAnnotations = ref<StepAnnotation[]>(normalizeStepAnnotations(props.annotations));
const selectedId = ref<string | null>(null);
const interaction = ref<InteractionState | null>(null);
const draftAnnotation = ref<StepAnnotation | null>(null);

watch(
  () => props.annotations,
  (value) => {
    workingAnnotations.value = normalizeStepAnnotations(value);
    if (selectedId.value && !workingAnnotations.value.some((annotation) => annotation.id === selectedId.value)) {
      selectedId.value = null;
      emit("update:selectedId", null);
    }
  },
  { deep: true, immediate: true }
);

watch(
  () => [props.imageWidth, props.imageHeight],
  ([width, height]) => {
    if (width && height) {
      naturalWidth.value = width;
      naturalHeight.value = height;
    }
  },
  { immediate: true }
);

watch(
  () => props.imageSrc,
  () => {
    selectedId.value = null;
    interaction.value = null;
    draftAnnotation.value = null;
  }
);

const stageWidth = computed(() => Math.max(320, Math.round((naturalWidth.value * props.zoom) / 100)));
const stageHeight = computed(() => Math.max(200, Math.round((naturalHeight.value * props.zoom) / 100)));
const selectedAnnotation = computed(
  () => workingAnnotations.value.find((annotation) => annotation.id === selectedId.value) ?? null
);

const displayAnnotations = computed(() => {
  return workingAnnotations.value.map((annotation) => {
    const bounds = getAnnotationBounds(annotation);
    return {
      ...annotation,
      bounds,
      px: {
        x: bounds.x * stageWidth.value,
        y: bounds.y * stageHeight.value,
        width: bounds.width * stageWidth.value,
        height: bounds.height * stageHeight.value
      }
    };
  });
});

const selectedDisplayAnnotation = computed(
  () => displayAnnotations.value.find((annotation) => annotation.id === selectedId.value) ?? null
);

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function clampSize(value: number, max = 1): number {
  return Math.max(0.012, Math.min(max, value));
}

function getAnnotationAspectRatio(annotation: StepAnnotation): number | null {
  if (annotation.type === "asset" && annotation.asset?.width && annotation.asset.height) {
    return annotation.asset.width / annotation.asset.height;
  }

  if (annotation.type === "magnify") {
    const bounds = getAnnotationBounds(annotation);
    if (bounds.width > 0.012 && bounds.height > 0.012) {
      return bounds.width / bounds.height;
    }
  }

  return null;
}

function preserveAreaAspectRatio(
  annotation: StepAnnotation,
  handle: Exclude<ResizeHandle, "start" | "end">,
  left: number,
  top: number,
  right: number,
  bottom: number
): { x: number; y: number; width: number; height: number } {
  const ratio = getAnnotationAspectRatio(annotation);
  if (!ratio) {
    return {
      x: left,
      y: top,
      width: clampSize(right - left, 1 - left),
      height: clampSize(bottom - top, 1 - top)
    };
  }

  const anchorX = handle === "nw" || handle === "sw" ? right : left;
  const anchorY = handle === "nw" || handle === "ne" ? bottom : top;
  const maxWidth = handle === "nw" || handle === "sw" ? anchorX : 1 - anchorX;
  const maxHeight = handle === "nw" || handle === "ne" ? anchorY : 1 - anchorY;
  const requestedWidth = clampSize(right - left, maxWidth);
  const requestedHeight = clampSize(bottom - top, maxHeight);

  const optionFromWidthWidth = Math.min(requestedWidth, maxHeight * ratio);
  const optionFromWidthHeight = optionFromWidthWidth / ratio;
  const optionFromHeightHeight = Math.min(requestedHeight, maxWidth / ratio);
  const optionFromHeightWidth = optionFromHeightHeight * ratio;

  const widthDistance =
    Math.abs(optionFromWidthWidth - requestedWidth) + Math.abs(optionFromWidthHeight - requestedHeight);
  const heightDistance =
    Math.abs(optionFromHeightWidth - requestedWidth) + Math.abs(optionFromHeightHeight - requestedHeight);

  const width = clampSize(
    widthDistance <= heightDistance ? optionFromWidthWidth : optionFromHeightWidth,
    maxWidth
  );
  const height = clampSize(
    widthDistance <= heightDistance ? optionFromWidthHeight : optionFromHeightHeight,
    maxHeight
  );

  const x = handle === "nw" || handle === "sw" ? anchorX - width : anchorX;
  const y = handle === "nw" || handle === "ne" ? anchorY - height : anchorY;

  return {
    x: clampUnit(x),
    y: clampUnit(y),
    width: clampSize(width, 1 - clampUnit(x)),
    height: clampSize(height, 1 - clampUnit(y))
  };
}

function setSelectedId(nextId: string | null): void {
  selectedId.value = nextId;
  emit("update:selectedId", nextId);
}

function syncAnnotations(nextAnnotations: StepAnnotation[], nextSelectedId = selectedId.value): void {
  const normalized = withUpdatedAnnotationOrder(nextAnnotations);
  workingAnnotations.value = normalized;
  emit("update:annotations", normalized);
  setSelectedId(nextSelectedId);
}

function updateWorkingAnnotations(nextAnnotations: StepAnnotation[]): void {
  workingAnnotations.value = withUpdatedAnnotationOrder(nextAnnotations);
}

function getStagePoint(event: MouseEvent): { x: number; y: number } | null {
  const element = stageRef.value;
  if (!element) {
    return null;
  }

  const bounds = element.getBoundingClientRect();
  if (!bounds.width || !bounds.height) {
    return null;
  }

  return {
    x: clampUnit((event.clientX - bounds.left) / bounds.width),
    y: clampUnit((event.clientY - bounds.top) / bounds.height)
  };
}

function isAreaTool(tool: Exclude<AnnotationTool, "select" | "click">): tool is AreaAnnotationType {
  return ["rect", "ellipse", "text", "blur", "highlight", "magnify", "cursor", "asset", "tooltip"].includes(tool);
}

function createAreaAnnotation(type: AreaAnnotationType, start: { x: number; y: number }, end: { x: number; y: number }): StepAnnotation {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.max(0.012, Math.abs(end.x - start.x));
  const height = Math.max(0.012, Math.abs(end.y - start.y));

  const base: StepAnnotation = {
    id: createAnnotationId(),
    type,
    x: Math.min(x, 1 - width),
    y: Math.min(y, 1 - height),
    width,
    height,
    color: "#f2b91f",
    strokeWidth: type === "highlight" ? 2 : 3,
    order: workingAnnotations.value.length
  };

  if (type === "text") {
    return {
      ...base,
      text: "Add text",
      backgroundColor: "rgba(18,24,30,0.84)",
      fillColor: "rgba(18,24,30,0.84)",
      textColor: "#ffffff",
      fontSize: 16,
      fontWeight: 700,
      radius: 10
    };
  }

  if (type === "tooltip") {
    return {
      ...base,
      text: "Explain this area",
      backgroundColor: "rgba(18,24,30,0.92)",
      fillColor: "rgba(18,24,30,0.92)",
      textColor: "#ffffff",
      fontSize: 15,
      fontWeight: 700,
      tooltipPlacement: "bottom",
      radius: 16,
      shadow: true
    };
  }

  if (type === "highlight") {
    return {
      ...base,
      fillColor: "rgba(247, 196, 34, 0.34)",
      opacity: 0.34,
      radius: 10
    };
  }

  if (type === "blur") {
    return {
      ...base,
      blurAmount: 12,
      radius: 12
    };
  }

  if (type === "magnify") {
    return {
      ...base,
      width: Math.max(0.08, width),
      height: Math.max(0.08, height),
      color: "#ffffff",
      magnifyZoom: 1.8,
      radius: 999,
      shadow: true
    };
  }

  if (type === "cursor") {
    return {
      ...base,
      width: Math.max(0.05, width),
      height: Math.max(0.07, height),
      color: "#111111",
      cursorVariant: "pointer"
    };
  }

  return {
    ...base,
    fillColor: "rgba(255,255,255,0.06)",
    radius: 10
  };
}

function createLineAnnotation(type: Extract<LinearAnnotationType, "line" | "arrow">, start: { x: number; y: number }, end: { x: number; y: number }): StepAnnotation {
  return {
    id: createAnnotationId(),
    type,
    x: start.x,
    y: start.y,
    x2: end.x,
    y2: end.y,
    color: "#f2b91f",
    strokeWidth: 4,
    showArrowHeadStart: false,
    showArrowHeadEnd: type === "arrow",
    lineStyle: "solid",
    order: workingAnnotations.value.length
  };
}

function createBrushAnnotation(start: { x: number; y: number }): StepAnnotation {
  return {
    id: createAnnotationId(),
    type: "brush",
    x: start.x,
    y: start.y,
    width: 0.012,
    height: 0.012,
    color: "#f2b91f",
    strokeWidth: 5,
    lineStyle: "solid",
    points: [start, start],
    order: workingAnnotations.value.length
  };
}

function appendBrushPoint(annotation: StepAnnotation, point: { x: number; y: number }): StepAnnotation {
  const currentPoints = annotation.points ?? [];
  const lastPoint = currentPoints.at(-1);
  if (lastPoint) {
    const delta = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
    if (delta < 0.0025) {
      return annotation;
    }
  }

  const points = [...currentPoints, point];
  return {
    ...annotation,
    points
  };
}

function createPointClick(point: { x: number; y: number }): StepAnnotation {
  const clickCount = workingAnnotations.value.filter((annotation) => annotation.type === "click").length + 1;
  return {
    id: createAnnotationId(),
    type: "click",
    x: point.x,
    y: point.y,
    color: "#f2b91f",
    strokeWidth: 3,
    order: workingAnnotations.value.length,
    number: clickCount,
    cursorVariant: "pointer",
    fontSize: 16
  };
}

function createCompactArea(type: Extract<AreaAnnotationType, "text" | "tooltip" | "cursor">, point: { x: number; y: number }): StepAnnotation {
  const sizes: Record<typeof type, { width: number; height: number }> = {
    text: { width: 0.18, height: 0.08 },
    tooltip: { width: 0.2, height: 0.11 },
    cursor: { width: 0.08, height: 0.12 }
  };

  const size = sizes[type];
  return createAreaAnnotation(
    type,
    {
      x: Math.max(0, Math.min(1 - size.width, point.x)),
      y: Math.max(0, Math.min(1 - size.height, point.y))
    },
    {
      x: Math.max(0, Math.min(1, point.x + size.width)),
      y: Math.max(0, Math.min(1, point.y + size.height))
    }
  );
}

function startWindowTracking(): void {
  window.addEventListener("mousemove", handleWindowMouseMove);
  window.addEventListener("mouseup", handleWindowMouseUp);
}

function stopWindowTracking(): void {
  window.removeEventListener("mousemove", handleWindowMouseMove);
  window.removeEventListener("mouseup", handleWindowMouseUp);
}

function beginDraw(tool: Exclude<AnnotationTool, "select" | "click">, point: { x: number; y: number }): void {
  interaction.value = {
    mode: "draw",
    tool,
    start: point
  };

  if (tool === "brush") {
    draftAnnotation.value = createBrushAnnotation(point);
  } else if (tool === "crop") {
    draftAnnotation.value = createAreaAnnotation("rect", point, point);
  } else if (isAreaTool(tool)) {
    draftAnnotation.value = createAreaAnnotation(tool, point, point);
  } else {
    draftAnnotation.value = createLineAnnotation(tool, point, point);
  }

  startWindowTracking();
}

function handleCanvasMouseDown(event: MouseEvent): void {
  if (event.button !== 0 || !props.imageSrc) {
    return;
  }

  event.preventDefault();

  const point = getStagePoint(event);
  if (!point) {
    return;
  }

  stageRef.value?.focus();

  if (props.activeTool === "select") {
    setSelectedId(null);
    return;
  }

  if (props.activeTool === "click") {
    const annotation = createPointClick(point);
    syncAnnotations([...workingAnnotations.value, annotation], annotation.id);
    return;
  }

  beginDraw(props.activeTool, point);
}

function handleWindowMouseMove(event: MouseEvent): void {
  const current = getStagePoint(event);
  const state = interaction.value;

  if (!current || !state) {
    return;
  }

  if (state.mode === "draw") {
    if (state.tool === "brush") {
      draftAnnotation.value = appendBrushPoint(draftAnnotation.value ?? createBrushAnnotation(state.start), current);
    } else if (state.tool === "crop") {
      draftAnnotation.value = createAreaAnnotation("rect", state.start, current);
    } else {
      draftAnnotation.value = isAreaTool(state.tool)
        ? createAreaAnnotation(state.tool, state.start, current)
        : createLineAnnotation(state.tool, state.start, current);
    }
    return;
  }

  if (state.mode === "move") {
    const dx = current.x - state.start.x;
    const dy = current.y - state.start.y;
    const updated = applyMove(state.original, dx, dy);
    updateWorkingAnnotations(
      workingAnnotations.value.map((annotation) => (annotation.id === state.id ? updated : annotation))
    );
    return;
  }

  const updated = applyResize(state.original, state.handle, current);
  updateWorkingAnnotations(
    workingAnnotations.value.map((annotation) => (annotation.id === state.id ? updated : annotation))
  );
}

function handleWindowMouseUp(event: MouseEvent): void {
  const point = getStagePoint(event);
  const state = interaction.value;
  stopWindowTracking();

  if (!state) {
    return;
  }

  if (state.mode === "draw") {
    const finalPoint = point ?? state.start;
    let created: StepAnnotation;

    if (state.tool === "crop") {
      const preview = createAreaAnnotation("rect", state.start, finalPoint);
      draftAnnotation.value = null;
      interaction.value = null;
      emit("request:crop", {
        x: preview.x,
        y: preview.y,
        width: preview.width ?? 0.1,
        height: preview.height ?? 0.1
      });
      return;
    }

    if (state.tool === "brush") {
      created = draftAnnotation.value ? appendBrushPoint(draftAnnotation.value, finalPoint) : createBrushAnnotation(finalPoint);
    } else if (isAreaTool(state.tool)) {
      const preview = createAreaAnnotation(state.tool, state.start, finalPoint);
      const smallDraw = (preview.width ?? 0) < 0.03 && (preview.height ?? 0) < 0.03;

      if ((state.tool === "text" || state.tool === "tooltip" || state.tool === "cursor") && smallDraw) {
        created = createCompactArea(state.tool, finalPoint);
      } else {
        created = preview;
      }
    } else {
      created = createLineAnnotation(state.tool, state.start, finalPoint);
    }

    let nextAnnotations = [...workingAnnotations.value, created];
    draftAnnotation.value = null;
    interaction.value = null;

    if (created.type === "text" || created.type === "tooltip") {
      const entered = window.prompt(
        created.type === "tooltip" ? "输入提示文案" : "输入标注文字",
        created.text ?? (created.type === "tooltip" ? "Explain this area" : "Add text")
      );

      if (entered !== null) {
        created = {
          ...created,
          text: entered.trim() || (created.type === "tooltip" ? "Explain this area" : "Add text")
        };
        nextAnnotations = [...workingAnnotations.value, created];
      }
    }

    syncAnnotations(nextAnnotations, created.id);
    return;
  }

  interaction.value = null;
  draftAnnotation.value = null;
  syncAnnotations(workingAnnotations.value, state.id);
}

function applyMove(annotation: StepAnnotation, dx: number, dy: number): StepAnnotation {
  if (annotation.type === "brush") {
    return translateBrushAnnotation(annotation, dx, dy);
  }

  if (annotation.type === "line" || annotation.type === "arrow") {
    const width = (annotation.x2 ?? annotation.x) - annotation.x;
    const height = (annotation.y2 ?? annotation.y) - annotation.y;
    const nextX = clampUnit(annotation.x + dx);
    const nextY = clampUnit(annotation.y + dy);
    return {
      ...annotation,
      x: nextX,
      y: nextY,
      x2: clampUnit(nextX + width),
      y2: clampUnit(nextY + height)
    };
  }

  if (annotation.type === "click") {
    return {
      ...annotation,
      x: clampUnit(annotation.x + dx),
      y: clampUnit(annotation.y + dy)
    };
  }

  const width = annotation.width ?? 0.16;
  const height = annotation.height ?? 0.12;

  return {
    ...annotation,
    x: Math.max(0, Math.min(1 - width, annotation.x + dx)),
    y: Math.max(0, Math.min(1 - height, annotation.y + dy))
  };
}

function applyResize(annotation: StepAnnotation, handle: ResizeHandle, point: { x: number; y: number }): StepAnnotation {
  if (annotation.type === "brush") {
    const bounds = getAnnotationBounds(annotation);
    let left = bounds.x;
    let top = bounds.y;
    let right = bounds.x + bounds.width;
    let bottom = bounds.y + bounds.height;

    if (handle === "nw" || handle === "sw") {
      left = point.x;
    }
    if (handle === "ne" || handle === "se") {
      right = point.x;
    }
    if (handle === "nw" || handle === "ne") {
      top = point.y;
    }
    if (handle === "sw" || handle === "se") {
      bottom = point.y;
    }

    const nextBounds = {
      x: clampUnit(Math.min(left, right)),
      y: clampUnit(Math.min(top, bottom)),
      width: clampSize(Math.abs(right - left)),
      height: clampSize(Math.abs(bottom - top))
    };
    return resizeBrushAnnotation(annotation, nextBounds);
  }

  if (annotation.type === "line" || annotation.type === "arrow") {
    if (handle === "start") {
      return {
        ...annotation,
        x: point.x,
        y: point.y
      };
    }

    return {
      ...annotation,
      x2: point.x,
      y2: point.y
    };
  }

  if (handle === "start" || handle === "end") {
    return annotation;
  }

  const bounds = getAnnotationBounds(annotation);
  let left = bounds.x;
  let top = bounds.y;
  let right = bounds.x + bounds.width;
  let bottom = bounds.y + bounds.height;

  if (handle === "nw" || handle === "sw") {
    left = point.x;
  }
  if (handle === "ne" || handle === "se") {
    right = point.x;
  }
  if (handle === "nw" || handle === "ne") {
    top = point.y;
  }
  if (handle === "sw" || handle === "se") {
    bottom = point.y;
  }

  const normalizedLeft = clampUnit(Math.min(left, right));
  const normalizedTop = clampUnit(Math.min(top, bottom));
  const normalizedRight = clampUnit(Math.max(left, right));
  const normalizedBottom = clampUnit(Math.max(top, bottom));
  const preservedBounds =
    annotation.type === "asset" || annotation.type === "magnify"
      ? preserveAreaAspectRatio(
          annotation,
          handle,
          normalizedLeft,
          normalizedTop,
          normalizedRight,
          normalizedBottom
        )
      : {
          x: normalizedLeft,
          y: normalizedTop,
          width: clampSize(normalizedRight - normalizedLeft, 1 - normalizedLeft),
          height: clampSize(normalizedBottom - normalizedTop, 1 - normalizedTop)
        };

  return {
    ...annotation,
    x: preservedBounds.x,
    y: preservedBounds.y,
    width: preservedBounds.width,
    height: preservedBounds.height
  };
}

function startMovingAnnotation(annotation: StepAnnotation, event: MouseEvent): void {
  if (props.activeTool !== "select") {
    return;
  }

  event.preventDefault();

  const point = getStagePoint(event);
  if (!point) {
    return;
  }

  stageRef.value?.focus();
  setSelectedId(annotation.id);
  interaction.value = {
    mode: "move",
    id: annotation.id,
    start: point,
    original: { ...annotation }
  };
  startWindowTracking();
}

function handleAnnotationPointerDown(annotation: StepAnnotation, event: MouseEvent): void {
  if (props.activeTool !== "select") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  startMovingAnnotation(annotation, event);
}

function startResizingAnnotation(annotation: StepAnnotation, handle: ResizeHandle, event: MouseEvent): void {
  if (props.activeTool !== "select") {
    return;
  }

  event.preventDefault();

  const point = getStagePoint(event);
  if (!point) {
    return;
  }

  event.stopPropagation();
  stageRef.value?.focus();
  setSelectedId(annotation.id);
  interaction.value = {
    mode: "resize",
    id: annotation.id,
    handle,
    start: point,
    original: { ...annotation }
  };
  startWindowTracking();
}

function deleteSelectedAnnotation(): void {
  if (!selectedId.value) {
    return;
  }

  syncAnnotations(
    workingAnnotations.value.filter((annotation) => annotation.id !== selectedId.value),
    null
  );
}

function editTextAnnotation(annotation: StepAnnotation): void {
  if (annotation.type !== "text" && annotation.type !== "tooltip") {
    return;
  }

  const entered = window.prompt(
    annotation.type === "tooltip" ? "编辑提示文案" : "编辑标注文字",
    annotation.text ?? (annotation.type === "tooltip" ? "Explain this area" : "Add text")
  );
  if (entered === null) {
    return;
  }

  syncAnnotations(
    workingAnnotations.value.map((item) =>
      item.id === annotation.id
        ? {
            ...item,
            text: entered.trim() || (annotation.type === "tooltip" ? "Explain this area" : "Add text")
          }
        : item
    ),
    annotation.id
  );
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelectedAnnotation();
    return;
  }

  if (event.key === "Escape") {
    interaction.value = null;
    draftAnnotation.value = null;
    stopWindowTracking();
    return;
  }

  if (event.key === "Enter" && (selectedAnnotation.value?.type === "text" || selectedAnnotation.value?.type === "tooltip")) {
    event.preventDefault();
    editTextAnnotation(selectedAnnotation.value);
  }
}

function handleImageLoad(event: Event): void {
  const target = event.target as HTMLImageElement;
  if (target.naturalWidth && target.naturalHeight) {
    naturalWidth.value = target.naturalWidth;
    naturalHeight.value = target.naturalHeight;
  }
}

function suppressNativeDrag(event: DragEvent): void {
  event.preventDefault();
}

function getHandleStyle(
  annotation: NonNullable<typeof selectedDisplayAnnotation.value>,
  handle: Exclude<ResizeHandle, "start" | "end">
): Record<string, string> {
  const size = 12;
  const half = size / 2;
  const { x, y, width, height } = annotation.px;

  const positionMap: Record<Exclude<ResizeHandle, "start" | "end">, { left: number; top: number; cursor: string }> = {
    nw: { left: x - half, top: y - half, cursor: "nwse-resize" },
    ne: { left: x + width - half, top: y - half, cursor: "nesw-resize" },
    se: { left: x + width - half, top: y + height - half, cursor: "nwse-resize" },
    sw: { left: x - half, top: y + height - half, cursor: "nesw-resize" }
  };

  return {
    left: `${positionMap[handle].left}px`,
    top: `${positionMap[handle].top}px`,
    cursor: positionMap[handle].cursor
  };
}

function getArrowHeadPoints(annotation: StepAnnotation, fromStart = false): string {
  const x1 = clampUnit(annotation.x) * stageWidth.value;
  const y1 = clampUnit(annotation.y) * stageHeight.value;
  const x2 = clampUnit(annotation.x2 ?? annotation.x) * stageWidth.value;
  const y2 = clampUnit(annotation.y2 ?? annotation.y) * stageHeight.value;
  const anchorX = fromStart ? x1 : x2;
  const anchorY = fromStart ? y1 : y2;
  const compareX = fromStart ? x2 : x1;
  const compareY = fromStart ? y2 : y1;
  const angle = Math.atan2(anchorY - compareY, anchorX - compareX);
  const length = Math.max(14, (annotation.strokeWidth ?? 4) * 3.8);
  const spread = Math.PI / 7;
  const p1x = anchorX - Math.cos(angle - spread) * length;
  const p1y = anchorY - Math.sin(angle - spread) * length;
  const p2x = anchorX - Math.cos(angle + spread) * length;
  const p2y = anchorY - Math.sin(angle + spread) * length;
  return `${anchorX},${anchorY} ${p1x},${p1y} ${p2x},${p2y}`;
}

function getClickDisplay(annotation: StepAnnotation): {
  x: number;
  y: number;
  radius: number;
  ringRadius: number;
  badgeX: number;
  badgeY: number;
  badgeSize: number;
  cursorLeft: number;
  cursorTop: number;
  cursorScale: number;
} {
  const x = clampUnit(annotation.x) * stageWidth.value;
  const y = clampUnit(annotation.y) * stageHeight.value;
  const radius = Math.max(28, Math.round(Math.min(stageWidth.value, stageHeight.value) * 0.038));
  const ringRadius = Math.round(radius * 0.64);
  const badgeSize = Math.max(30, Math.min(42, Math.round((annotation.fontSize ?? 16) * 2)));
  const cursorWidth = Math.max(42, Math.round(radius * 1.1));
  const cursorLeft = Math.max(0, Math.min(stageWidth.value - cursorWidth, x - 16));
  const cursorTop = Math.max(0, Math.min(stageHeight.value - cursorWidth * 1.26, y + 10));
  const badgeX = Math.max(12, Math.min(stageWidth.value - badgeSize - 12, x + radius * 0.48));
  const badgeY = Math.max(12, Math.min(stageHeight.value - badgeSize - 12, y - radius * 0.84));

  return {
    x,
    y,
    radius,
    ringRadius,
    badgeX,
    badgeY,
    badgeSize,
    cursorLeft,
    cursorTop,
    cursorScale: cursorWidth / 42
  };
}

function getCursorGlyph(annotation: StepAnnotation): { path: string; scale: number } {
  const variant: AnnotationCursorVariant = annotation.cursorVariant ?? "pointer";
  if (variant === "text") {
    return { path: TEXT_CURSOR_PATH, scale: 1 };
  }
  if (variant === "hand") {
    return { path: HAND_CURSOR_PATH, scale: 1 };
  }
  return { path: CLICK_CURSOR_PATH, scale: 1 };
}

function getCursorTransform(annotation: StepAnnotation): string {
  const { x, y, width, height } = getAnnotationBounds(annotation);
  const pxWidth = width * stageWidth.value;
  const pxHeight = height * stageHeight.value;
  const variant = annotation.cursorVariant ?? "pointer";
  const scale = variant === "text" ? Math.min(pxWidth / 42, pxHeight / 42) : Math.min(pxWidth / 42, pxHeight / 50);
  return `translate(${x * stageWidth.value}, ${y * stageHeight.value}) scale(${scale})`;
}

function getMagnifyStyle(annotation: StepAnnotation): Record<string, string> {
  const bounds = getAnnotationBounds(annotation);
  const width = bounds.width * stageWidth.value;
  const height = bounds.height * stageHeight.value;
  const centerX = (bounds.x + bounds.width / 2) * stageWidth.value;
  const centerY = (bounds.y + bounds.height / 2) * stageHeight.value;
  const zoom = Math.max(1.2, Math.min(4, annotation.magnifyZoom ?? 1.8));

  return {
    left: `${bounds.x * stageWidth.value}px`,
    top: `${bounds.y * stageHeight.value}px`,
    width: `${width}px`,
    height: `${height}px`,
    borderColor: annotation.color || "#ffffff",
    backgroundImage: `url(${props.imageSrc})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${stageWidth.value * zoom}px ${stageHeight.value * zoom}px`,
    backgroundPosition: `${-centerX * zoom + width / 2}px ${-centerY * zoom + height / 2}px`,
    opacity: String(annotation.opacity ?? 1),
    boxShadow:
      annotation.shadow === false
        ? "none"
        : selectedId.value === annotation.id
          ? "0 0 0 2px rgba(53, 109, 255, 0.44), 0 14px 30px rgba(18, 24, 32, 0.28)"
          : "0 12px 26px rgba(18, 24, 32, 0.22)"
  };
}

function getTooltipPointerStyle(annotation: StepAnnotation): Record<string, string> {
  const placement = annotation.tooltipPlacement ?? "bottom";
  const size = 14;
  const base: Record<string, string> = {
    width: "0",
    height: "0",
    position: "absolute",
    borderStyle: "solid"
  };

  if (placement === "top") {
    return {
      ...base,
      left: "28px",
      top: `-${size}px`,
      borderWidth: `0 ${size / 2}px ${size}px ${size / 2}px`,
      borderColor: `transparent transparent ${annotation.fillColor || annotation.backgroundColor || "#1b222d"} transparent`
    };
  }

  if (placement === "left") {
    return {
      ...base,
      left: `-${size}px`,
      top: "24px",
      borderWidth: `${size / 2}px ${size}px ${size / 2}px 0`,
      borderColor: `transparent ${annotation.fillColor || annotation.backgroundColor || "#1b222d"} transparent transparent`
    };
  }

  if (placement === "right") {
    return {
      ...base,
      right: `-${size}px`,
      top: "24px",
      borderWidth: `${size / 2}px 0 ${size / 2}px ${size}px`,
      borderColor: `transparent transparent transparent ${annotation.fillColor || annotation.backgroundColor || "#1b222d"}`
    };
  }

  return {
    ...base,
    left: "28px",
    bottom: `-${size}px`,
    borderWidth: `${size}px ${size / 2}px 0 ${size / 2}px`,
    borderColor: `${annotation.fillColor || annotation.backgroundColor || "#1b222d"} transparent transparent transparent`
  };
}

function getTextAnchor(annotation: StepAnnotation): "start" | "middle" | "end" {
  if (annotation.textAlign === "center") {
    return "middle";
  }
  if (annotation.textAlign === "right") {
    return "end";
  }
  return "start";
}

function getTextX(annotation: typeof displayAnnotations.value[number]): number {
  if (annotation.textAlign === "center") {
    return annotation.px.x + annotation.px.width / 2;
  }
  if (annotation.textAlign === "right") {
    return annotation.px.x + annotation.px.width - 14;
  }
  return annotation.px.x + 14;
}

onBeforeUnmount(() => {
  stopWindowTracking();
});
</script>

<template>
  <div
    ref="stageRef"
    class="annotator"
    tabindex="0"
    :style="{ width: `${stageWidth}px`, height: `${stageHeight}px` }"
    @keydown="handleKeydown"
    @mousedown="handleCanvasMouseDown"
    @dragstart.prevent="suppressNativeDrag"
  >
    <img
      v-if="imageSrc"
      class="annotator__image"
      :src="imageSrc"
      :alt="imageAlt"
      draggable="false"
      @load="handleImageLoad"
      @dragstart.prevent="suppressNativeDrag"
    />
    <div v-else class="annotator__empty">No screenshot selected</div>

    <template v-for="annotation in displayAnnotations" :key="annotation.id">
      <div
        v-if="annotation.type === 'blur'"
        class="annotator__blur"
        :class="{ 'annotator__blur--selected': selectedId === annotation.id }"
        :style="{
          left: `${annotation.px.x}px`,
          top: `${annotation.px.y}px`,
          width: `${annotation.px.width}px`,
          height: `${annotation.px.height}px`,
          backdropFilter: `blur(${annotation.blurAmount ?? 12}px)`
        }"
        @mousedown="handleAnnotationPointerDown(annotation, $event)"
      ></div>

      <div
        v-else-if="annotation.type === 'magnify'"
        class="annotator__magnify"
        :class="{ 'annotator__magnify--selected': selectedId === annotation.id }"
        :style="getMagnifyStyle(annotation)"
        @mousedown="handleAnnotationPointerDown(annotation, $event)"
      ></div>

      <div
        v-else-if="annotation.type === 'tooltip'"
        class="annotator__tooltip-html"
        :class="{ 'annotator__tooltip-html--selected': selectedId === annotation.id }"
        :style="{
          left: `${annotation.px.x}px`,
          top: `${annotation.px.y}px`,
          width: `${annotation.px.width}px`,
          minHeight: `${annotation.px.height}px`,
          background: annotation.fillColor || annotation.backgroundColor || 'rgba(18,24,30,0.92)',
          color: annotation.textColor || '#ffffff',
          borderRadius: `${annotation.radius ?? 16}px`,
          fontSize: `${annotation.fontSize ?? 15}px`,
          fontWeight: String(annotation.fontWeight ?? 700),
          textAlign: annotation.textAlign ?? 'left',
          opacity: String(annotation.opacity ?? 1),
          boxShadow: annotation.shadow === false ? 'none' : '0 12px 24px rgba(18,24,32,0.24)'
        }"
        @mousedown="handleAnnotationPointerDown(annotation, $event)"
        @dblclick.stop="editTextAnnotation(annotation)"
      >
        <span class="annotator__tooltip-pointer" :style="getTooltipPointerStyle(annotation)"></span>
        <span>{{ annotation.text }}</span>
      </div>

      <div
        v-else-if="annotation.type === 'asset' && annotation.asset"
        class="annotator__asset"
        :class="{ 'annotator__asset--selected': selectedId === annotation.id }"
        :style="{
          left: `${annotation.px.x}px`,
          top: `${annotation.px.y}px`,
          width: `${annotation.px.width}px`,
          height: `${annotation.px.height}px`,
          borderRadius: `${annotation.radius ?? 14}px`,
          opacity: String(annotation.opacity ?? 1),
          boxShadow: annotation.shadow === false ? 'none' : '0 12px 26px rgba(18,24,32,0.18)'
        }"
        @mousedown="handleAnnotationPointerDown(annotation, $event)"
      >
        <img
          :src="annotation.asset.appUrl || annotation.asset.fileUrl"
          alt=""
          draggable="false"
          @dragstart.prevent="suppressNativeDrag"
        />
      </div>
    </template>

    <svg class="annotator__svg" :viewBox="`0 0 ${stageWidth} ${stageHeight}`" preserveAspectRatio="none">
      <defs>
        <filter id="annotatorGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="annotatorCursorShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.22)" />
        </filter>
      </defs>

      <template v-for="annotation in displayAnnotations" :key="`svg-${annotation.id}`">
        <g
          v-if="annotation.type === 'click'"
          class="annotator__shape"
          :class="{ 'annotator__shape--active': selectedId === annotation.id }"
          @mousedown="handleAnnotationPointerDown(annotation, $event)"
        >
          <circle
            :cx="getClickDisplay(annotation).x"
            :cy="getClickDisplay(annotation).y"
            :r="getClickDisplay(annotation).radius"
            fill="rgba(241, 200, 64, 0.42)"
            filter="url(#annotatorGlow)"
          />
          <circle
            :cx="getClickDisplay(annotation).x"
            :cy="getClickDisplay(annotation).y"
            :r="getClickDisplay(annotation).ringRadius"
            fill="rgba(241, 200, 64, 0.14)"
            stroke="rgba(241, 200, 64, 0.92)"
            stroke-width="2"
          />
          <rect
            :x="getClickDisplay(annotation).badgeX"
            :y="getClickDisplay(annotation).badgeY"
            :width="getClickDisplay(annotation).badgeSize"
            :height="getClickDisplay(annotation).badgeSize"
            :rx="getClickDisplay(annotation).badgeSize / 2"
            :ry="getClickDisplay(annotation).badgeSize / 2"
            fill="rgba(18,24,30,0.9)"
            stroke="rgba(255,255,255,0.92)"
            stroke-width="1.4"
          />
          <text
            :x="getClickDisplay(annotation).badgeX + getClickDisplay(annotation).badgeSize / 2"
            :y="getClickDisplay(annotation).badgeY + getClickDisplay(annotation).badgeSize * 0.66"
            text-anchor="middle"
            font-family="Avenir Next, Arial, sans-serif"
            :font-size="Math.max(15, Math.round((annotation.fontSize ?? 16) * 1.05))"
            font-weight="700"
            fill="#ffffff"
          >
            {{ annotation.number }}
          </text>
          <g
            :transform="`translate(${getClickDisplay(annotation).cursorLeft}, ${getClickDisplay(annotation).cursorTop}) scale(${getClickDisplay(annotation).cursorScale})`"
            filter="url(#annotatorCursorShadow)"
          >
            <path :d="CLICK_CURSOR_PATH" fill="#ffffff" stroke="#111111" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
          </g>
        </g>

        <g
          v-else-if="annotation.type === 'cursor'"
          class="annotator__shape"
          :class="{ 'annotator__shape--active': selectedId === annotation.id }"
          @mousedown="handleAnnotationPointerDown(annotation, $event)"
        >
          <g :transform="getCursorTransform(annotation)" filter="url(#annotatorCursorShadow)">
            <path
              :d="getCursorGlyph(annotation).path"
              :fill="annotation.cursorVariant === 'text' ? (annotation.color || '#ffffff') : '#ffffff'"
              :stroke="annotation.cursorVariant === 'text' ? 'rgba(18,24,30,0.72)' : (annotation.color || '#111111')"
              :stroke-width="annotation.cursorVariant === 'text' ? 1.8 : 2.2"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </g>
        </g>

        <g
          v-else-if="annotation.type === 'brush'"
          class="annotator__shape"
          :class="{ 'annotator__shape--active': selectedId === annotation.id }"
          @mousedown="handleAnnotationPointerDown(annotation, $event)"
        >
          <polyline
            :points="(annotation.points ?? []).map((point) => `${point.x * stageWidth},${point.y * stageHeight}`).join(' ')"
            fill="none"
            :stroke="annotation.color || '#f2b91f'"
            :stroke-width="annotation.strokeWidth ?? 5"
            :stroke-dasharray="annotation.lineStyle === 'dashed' ? '12 8' : undefined"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>

        <g
          v-else-if="annotation.type === 'line' || annotation.type === 'arrow'"
          class="annotator__shape"
          :class="{ 'annotator__shape--active': selectedId === annotation.id }"
          @mousedown="handleAnnotationPointerDown(annotation, $event)"
        >
          <line
            :x1="annotation.x * stageWidth"
            :y1="annotation.y * stageHeight"
            :x2="(annotation.x2 ?? annotation.x) * stageWidth"
            :y2="(annotation.y2 ?? annotation.y) * stageHeight"
            :stroke="annotation.color || '#f2b91f'"
            :stroke-width="annotation.strokeWidth ?? 4"
            :stroke-dasharray="annotation.lineStyle === 'dashed' ? '12 8' : undefined"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <polygon
            v-if="annotation.showArrowHeadStart"
            :points="getArrowHeadPoints(annotation, true)"
            :fill="annotation.color || '#f2b91f'"
          />
          <polygon
            v-if="annotation.showArrowHeadEnd"
            :points="getArrowHeadPoints(annotation)"
            :fill="annotation.color || '#f2b91f'"
          />
          <line
            :x1="annotation.x * stageWidth"
            :y1="annotation.y * stageHeight"
            :x2="(annotation.x2 ?? annotation.x) * stageWidth"
            :y2="(annotation.y2 ?? annotation.y) * stageHeight"
            stroke="transparent"
            stroke-width="18"
          />
        </g>

        <g
          v-else-if="annotation.type === 'ellipse'"
          class="annotator__shape"
          :class="{ 'annotator__shape--active': selectedId === annotation.id }"
          @mousedown="handleAnnotationPointerDown(annotation, $event)"
        >
          <ellipse
            :cx="annotation.px.x + annotation.px.width / 2"
            :cy="annotation.px.y + annotation.px.height / 2"
            :rx="annotation.px.width / 2"
            :ry="annotation.px.height / 2"
            :fill="annotation.fillColor || 'rgba(255,255,255,0.04)'"
            :fill-opacity="annotation.fillColor ? (annotation.opacity ?? 1) : 0.08"
            :stroke="annotation.color || '#f2b91f'"
            :stroke-width="annotation.strokeWidth ?? 3"
          />
        </g>

        <g
          v-else-if="annotation.type === 'text'"
          class="annotator__shape"
          :class="{ 'annotator__shape--active': selectedId === annotation.id }"
          @mousedown="handleAnnotationPointerDown(annotation, $event)"
          @dblclick.stop="editTextAnnotation(annotation)"
        >
          <rect
            :x="annotation.px.x"
            :y="annotation.px.y"
            :width="annotation.px.width"
            :height="annotation.px.height"
            :rx="annotation.radius ?? 10"
            :ry="annotation.radius ?? 10"
            :fill="annotation.fillColor || annotation.backgroundColor || 'rgba(18,24,30,0.84)'"
            stroke="rgba(255,255,255,0.82)"
            stroke-width="1.4"
          />
          <text
            :x="getTextX(annotation)"
            :y="annotation.px.y + Math.min(annotation.px.height / 2 + 6, annotation.px.height - 12)"
            :text-anchor="getTextAnchor(annotation)"
            font-family="Avenir Next, Arial, sans-serif"
            :font-size="annotation.fontSize ?? Math.max(14, Math.min(annotation.px.height * 0.4, 24))"
            :font-weight="annotation.fontWeight ?? 700"
            :fill="annotation.textColor || '#ffffff'"
          >
            {{ annotation.text }}
          </text>
        </g>

        <g
          v-else-if="annotation.type === 'highlight'"
          class="annotator__shape"
          :class="{ 'annotator__shape--active': selectedId === annotation.id }"
          @mousedown="handleAnnotationPointerDown(annotation, $event)"
        >
          <rect
            :x="annotation.px.x"
            :y="annotation.px.y"
            :width="annotation.px.width"
            :height="annotation.px.height"
            :rx="Math.min(annotation.radius ?? 10, 14)"
            :ry="Math.min(annotation.radius ?? 10, 14)"
            :fill="annotation.fillColor || 'rgba(247, 196, 34, 0.34)'"
            :fill-opacity="annotation.opacity ?? 0.34"
            :stroke="annotation.color || '#f2b91f'"
            :stroke-width="annotation.strokeWidth ?? 2"
          />
        </g>

        <g
          v-else-if="annotation.type === 'rect'"
          class="annotator__shape"
          :class="{ 'annotator__shape--active': selectedId === annotation.id }"
          @mousedown="handleAnnotationPointerDown(annotation, $event)"
        >
          <rect
            :x="annotation.px.x"
            :y="annotation.px.y"
            :width="annotation.px.width"
            :height="annotation.px.height"
            :rx="annotation.radius ?? 10"
            :ry="annotation.radius ?? 10"
            :fill="annotation.fillColor || 'rgba(255,255,255,0.04)'"
            :fill-opacity="annotation.fillColor ? (annotation.opacity ?? 1) : 0.08"
            :stroke="annotation.color || '#f2b91f'"
            :stroke-width="annotation.strokeWidth ?? 3"
          />
        </g>
      </template>

      <template v-if="draftAnnotation">
        <g v-if="draftAnnotation.type === 'line' || draftAnnotation.type === 'arrow'">
          <line
            :x1="draftAnnotation.x * stageWidth"
            :y1="draftAnnotation.y * stageHeight"
            :x2="(draftAnnotation.x2 ?? draftAnnotation.x) * stageWidth"
            :y2="(draftAnnotation.y2 ?? draftAnnotation.y) * stageHeight"
            stroke="#f2b91f"
            stroke-width="4"
            stroke-linecap="round"
            :stroke-dasharray="draftAnnotation.type === 'line' ? '12 8' : undefined"
          />
          <polygon v-if="draftAnnotation.type === 'arrow'" :points="getArrowHeadPoints(draftAnnotation)" fill="#f2b91f" />
        </g>
        <polyline
          v-else-if="draftAnnotation.type === 'brush'"
          :points="(draftAnnotation.points ?? []).map((point) => `${point.x * stageWidth},${point.y * stageHeight}`).join(' ')"
          fill="none"
          stroke="#f2b91f"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <rect
          v-else-if="draftAnnotation.type === 'rect' || draftAnnotation.type === 'blur' || draftAnnotation.type === 'text' || draftAnnotation.type === 'highlight' || draftAnnotation.type === 'magnify' || draftAnnotation.type === 'cursor' || draftAnnotation.type === 'tooltip' || draftAnnotation.type === 'asset'"
          :x="getAnnotationBounds(draftAnnotation).x * stageWidth"
          :y="getAnnotationBounds(draftAnnotation).y * stageHeight"
          :width="getAnnotationBounds(draftAnnotation).width * stageWidth"
          :height="getAnnotationBounds(draftAnnotation).height * stageHeight"
          :rx="draftAnnotation.type === 'magnify' ? 999 : 12"
          :ry="draftAnnotation.type === 'magnify' ? 999 : 12"
          :fill="draftAnnotation.type === 'blur' ? 'rgba(12,18,24,0.2)' : draftAnnotation.type === 'highlight' ? 'rgba(247, 196, 34, 0.24)' : 'rgba(255,255,255,0.04)'"
          stroke="#f2b91f"
          stroke-width="3"
          stroke-dasharray="8 5"
        />
        <ellipse
          v-else-if="draftAnnotation.type === 'ellipse'"
          :cx="(getAnnotationBounds(draftAnnotation).x + getAnnotationBounds(draftAnnotation).width / 2) * stageWidth"
          :cy="(getAnnotationBounds(draftAnnotation).y + getAnnotationBounds(draftAnnotation).height / 2) * stageHeight"
          :rx="(getAnnotationBounds(draftAnnotation).width * stageWidth) / 2"
          :ry="(getAnnotationBounds(draftAnnotation).height * stageHeight) / 2"
          fill="rgba(255,255,255,0.04)"
          stroke="#f2b91f"
          stroke-width="3"
          stroke-dasharray="8 5"
        />
      </template>
    </svg>

    <div
      v-if="selectedDisplayAnnotation && props.activeTool === 'select'"
      class="annotator__selection"
      :class="{ 'annotator__selection--point': selectedDisplayAnnotation.type === 'click' }"
      :style="{
        left: `${selectedDisplayAnnotation.px.x}px`,
        top: `${selectedDisplayAnnotation.px.y}px`,
        width: `${selectedDisplayAnnotation.px.width}px`,
        height: `${selectedDisplayAnnotation.px.height}px`
      }"
    >
      <template v-if="selectedDisplayAnnotation.type === 'line' || selectedDisplayAnnotation.type === 'arrow'">
        <button
          class="annotator__endpoint"
          type="button"
          :style="{
            left: `${(selectedDisplayAnnotation.x - selectedDisplayAnnotation.bounds.x) * stageWidth - 7}px`,
            top: `${(selectedDisplayAnnotation.y - selectedDisplayAnnotation.bounds.y) * stageHeight - 7}px`
          }"
          @mousedown.stop="startResizingAnnotation(selectedDisplayAnnotation, 'start', $event)"
        ></button>
        <button
          class="annotator__endpoint"
          type="button"
          :style="{
            left: `${((selectedDisplayAnnotation.x2 ?? selectedDisplayAnnotation.x) - selectedDisplayAnnotation.bounds.x) * stageWidth - 7}px`,
            top: `${((selectedDisplayAnnotation.y2 ?? selectedDisplayAnnotation.y) - selectedDisplayAnnotation.bounds.y) * stageHeight - 7}px`
          }"
          @mousedown.stop="startResizingAnnotation(selectedDisplayAnnotation, 'end', $event)"
        ></button>
      </template>
      <template v-else-if="selectedDisplayAnnotation.type !== 'click'">
        <button
          v-for="handle in ['nw', 'ne', 'se', 'sw']"
          :key="handle"
          class="annotator__handle"
          type="button"
          :style="getHandleStyle(selectedDisplayAnnotation, handle as 'nw' | 'ne' | 'se' | 'sw')"
          @mousedown.stop="startResizingAnnotation(selectedDisplayAnnotation, handle as 'nw' | 'ne' | 'se' | 'sw', $event)"
        ></button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.annotator {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(45deg, rgba(223, 226, 232, 0.55) 25%, transparent 25%, transparent 75%, rgba(223, 226, 232, 0.55) 75%),
    linear-gradient(45deg, rgba(223, 226, 232, 0.55) 25%, transparent 25%, transparent 75%, rgba(223, 226, 232, 0.55) 75%);
  background-position: 0 0, 10px 10px;
  background-size: 20px 20px;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.annotator__image,
.annotator__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.annotator__image {
  object-fit: fill;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
}

.annotator__svg {
  overflow: visible;
  pointer-events: none;
}

.annotator__shape {
  cursor: move;
  pointer-events: auto;
}

.annotator__shape--active {
  filter: drop-shadow(0 0 0.45rem rgba(53, 109, 255, 0.2));
}

.annotator__blur,
.annotator__magnify,
.annotator__tooltip-html,
.annotator__asset {
  position: absolute;
  cursor: move;
}

.annotator__blur {
  border: 3px solid #f2b91f;
  border-radius: 12px;
  background: rgba(16, 24, 32, 0.2);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.36);
}

.annotator__blur--selected {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.9),
    inset 0 0 0 1px rgba(255, 255, 255, 0.46);
}

.annotator__magnify {
  border: 4px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 12px 26px rgba(18, 24, 32, 0.22);
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.12);
}

.annotator__magnify--selected {
  box-shadow:
    0 0 0 2px rgba(53, 109, 255, 0.44),
    0 14px 30px rgba(18, 24, 32, 0.28);
}

.annotator__tooltip-html {
  padding: 12px 14px;
  line-height: 1.35;
  box-shadow: 0 12px 24px rgba(18, 24, 32, 0.24);
}

.annotator__tooltip-html--selected {
  box-shadow:
    0 0 0 2px rgba(53, 109, 255, 0.44),
    0 12px 24px rgba(18, 24, 32, 0.24);
}

.annotator__asset {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: 0 12px 26px rgba(18, 24, 32, 0.18);
}

.annotator__asset img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
}

.annotator__asset--selected {
  box-shadow:
    0 0 0 2px rgba(53, 109, 255, 0.44),
    0 12px 26px rgba(18, 24, 32, 0.18);
}

.annotator__tooltip-pointer {
  pointer-events: none;
}

.annotator__selection {
  position: absolute;
  border: 2px dashed rgba(56, 105, 255, 0.95);
  border-radius: 12px;
  pointer-events: none;
}

.annotator__selection--point {
  border-radius: 999px;
}

.annotator__handle,
.annotator__endpoint {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #356dff;
  box-shadow: 0 1px 8px rgba(19, 31, 53, 0.24);
  pointer-events: auto;
  padding: 0;
}

.annotator__endpoint {
  width: 14px;
  height: 14px;
}

.annotator__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #5f6975;
  font-size: 14px;
  background: #f4f5f8;
}
</style>
