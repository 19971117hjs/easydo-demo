import type {
  AnnotationCursorVariant,
  AnnotationLineStyle,
  AnnotationTextAlign,
  AnnotationTooltipPlacement,
  StepAssetRef,
  StepAnnotation,
  StepAnnotationType
} from "./contracts";

const AREA_TYPES = new Set<StepAnnotationType>([
  "rect",
  "ellipse",
  "text",
  "blur",
  "highlight",
  "magnify",
  "cursor",
  "asset",
  "tooltip"
]);
const LINE_TYPES = new Set<StepAnnotationType>(["line", "arrow", "brush"]);
const DEFAULT_COLOR = "#f2b91f";
const DEFAULT_TEXT_COLOR = "#ffffff";
const DEFAULT_BACKGROUND = "rgba(18,24,30,0.82)";
const DEFAULT_STROKE = 3;
const MIN_SIZE = 0.012;

export const CLICK_CURSOR_PATH = `
  M14 1
  C11.8 1 10 2.8 10 5
  v29.5
  l-6.1-5.2
  c-1.9-1.6-4.8-1.4-6.4 0.5
  c-1.6 1.9-1.4 4.8 0.5 6.4
  l17.7 15.1
  c1 0.9 2.4 1.3 3.7 1.3
  h12.5
  c3.7 0 6.8-2.8 7.2-6.5
  l2.6-21.8
  c0.2-2.2-1.3-4.3-3.5-4.7
  c-1.4-0.3-2.8 0.2-3.8 1
  V13
  c0-2.2-1.8-4-4-4
  c-1.1 0-2.1 0.4-2.8 1.1
  C28.5 8.3 27 7 25.2 7
  c-1.5 0-2.8 0.8-3.5 2
  C20.9 7.8 19.5 7 18 7
  c-1.5 0-2.8 0.7-3.6 1.8
  V5
  C18.4 2.8 16.6 1 14 1
  z
`.trim();

export const TEXT_CURSOR_PATH = `
  M17 3
  h8
  v5
  h-2
  v22
  h2
  v5
  h-8
  v-5
  h2
  V8
  h-2
  z
`.trim();

export const HAND_CURSOR_PATH = `
  M16 4
  c-2.2 0-4 1.8-4 4
  v13
  c0 6.9 5.6 12.5 12.5 12.5
  h7.6
  c6.1 0 11.3-4.5 12.1-10.5
  l1.7-13.3
  c0.3-2.2-1.2-4.3-3.4-4.8
  c-1.6-0.4-3.1 0.1-4.2 1.1
  V12
  c0-2.2-1.8-4-4-4
  c-1.6 0-3 0.9-3.6 2.2
  C24.6 8.9 23.1 8 21.4 8
  c-1.5 0-2.8 0.7-3.6 1.8
  V8
  c0-2.2-1.8-4-4-4
  z
`.trim();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function clampMinUnit(value: number, min = MIN_SIZE): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(1, value));
}

function clampOpacity(value: number | null | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0.05, Math.min(1, value ?? fallback));
}

function clampInteger(value: number | null | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(value ?? fallback)));
}

function normalizeLineStyle(value: AnnotationLineStyle | null | undefined): AnnotationLineStyle {
  return value === "dashed" ? "dashed" : "solid";
}

function normalizeTextAlign(value: AnnotationTextAlign | null | undefined): AnnotationTextAlign {
  if (value === "center" || value === "right") {
    return value;
  }
  return "left";
}

function normalizeCursorVariant(value: AnnotationCursorVariant | null | undefined): AnnotationCursorVariant {
  if (value === "text" || value === "hand") {
    return value;
  }
  return "pointer";
}

function normalizeTooltipPlacement(
  value: AnnotationTooltipPlacement | null | undefined
): AnnotationTooltipPlacement {
  if (value === "top" || value === "left" || value === "right") {
    return value;
  }
  return "bottom";
}

function normalizeRotation(value: number | null | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  let normalized = (value ?? 0) % 360;
  if (normalized > 180) {
    normalized -= 360;
  }
  if (normalized <= -180) {
    normalized += 360;
  }

  return normalized;
}

function normalizeArea(
  x: number,
  y: number,
  width: number | null | undefined,
  height: number | null | undefined
): Pick<StepAnnotation, "x" | "y" | "width" | "height"> {
  const normalizedX = clampUnit(x);
  const normalizedY = clampUnit(y);
  const normalizedWidth = clampMinUnit(width ?? 0.16);
  const normalizedHeight = clampMinUnit(height ?? 0.12);

  return {
    x: Math.min(normalizedX, 1 - normalizedWidth),
    y: Math.min(normalizedY, 1 - normalizedHeight),
    width: normalizedWidth,
    height: normalizedHeight
  };
}

function getDefaultArea(type: StepAnnotationType): { width: number; height: number } {
  switch (type) {
    case "cursor":
      return { width: 0.08, height: 0.12 };
    case "asset":
      return { width: 0.18, height: 0.18 };
    case "tooltip":
      return { width: 0.2, height: 0.11 };
    case "magnify":
      return { width: 0.2, height: 0.2 };
    case "text":
      return { width: 0.18, height: 0.08 };
    case "highlight":
      return { width: 0.2, height: 0.12 };
    default:
      return { width: 0.16, height: 0.12 };
  }
}

function normalizePoints(points: Array<{ x: number; y: number }> | null | undefined): Array<{ x: number; y: number }> {
  const normalized = (points ?? [])
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({ x: clampUnit(point.x), y: clampUnit(point.y) }));

  if (normalized.length >= 2) {
    return normalized;
  }

  return [
    { x: 0.2, y: 0.2 },
    { x: 0.3, y: 0.3 }
  ];
}

function getPointsBounds(points: Array<{ x: number; y: number }>): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(MIN_SIZE, maxX - minX),
    height: Math.max(MIN_SIZE, maxY - minY)
  };
}

function translatePoints(
  points: Array<{ x: number; y: number }>,
  dx: number,
  dy: number
): Array<{ x: number; y: number }> {
  return points.map((point) => ({
    x: clampUnit(point.x + dx),
    y: clampUnit(point.y + dy)
  }));
}

function scalePointsToBounds(
  points: Array<{ x: number; y: number }>,
  nextBounds: { x: number; y: number; width: number; height: number }
): Array<{ x: number; y: number }> {
  const currentBounds = getPointsBounds(points);
  const widthRatio = currentBounds.width <= MIN_SIZE ? 1 : nextBounds.width / currentBounds.width;
  const heightRatio = currentBounds.height <= MIN_SIZE ? 1 : nextBounds.height / currentBounds.height;

  return points.map((point) => ({
    x: clampUnit(nextBounds.x + (point.x - currentBounds.x) * widthRatio),
    y: clampUnit(nextBounds.y + (point.y - currentBounds.y) * heightRatio)
  }));
}

function cropPoint(
  point: { x: number; y: number },
  selection: { x: number; y: number; width: number; height: number }
): { x: number; y: number } | null {
  if (
    point.x < selection.x ||
    point.x > selection.x + selection.width ||
    point.y < selection.y ||
    point.y > selection.y + selection.height
  ) {
    return null;
  }

  return {
    x: clampUnit((point.x - selection.x) / selection.width),
    y: clampUnit((point.y - selection.y) / selection.height)
  };
}

function getArrowHeadPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  length: number,
  spread = Math.PI / 7,
  fromStart = false
): string {
  const anchorX = fromStart ? x1 : x2;
  const anchorY = fromStart ? y1 : y2;
  const compareX = fromStart ? x2 : x1;
  const compareY = fromStart ? y2 : y1;
  const angle = Math.atan2(anchorY - compareY, anchorX - compareX);
  const point1X = anchorX - Math.cos(angle - spread) * length;
  const point1Y = anchorY - Math.sin(angle - spread) * length;
  const point2X = anchorX - Math.cos(angle + spread) * length;
  const point2Y = anchorY - Math.sin(angle + spread) * length;
  return `${anchorX},${anchorY} ${point1X},${point1Y} ${point2X},${point2Y}`;
}

function getSvgTextAnchor(annotation: StepAnnotation): "start" | "middle" | "end" {
  if (annotation.textAlign === "center") {
    return "middle";
  }
  if (annotation.textAlign === "right") {
    return "end";
  }
  return "start";
}

function getSvgTextX(annotation: StepAnnotation, x: number, width: number): number {
  if (annotation.textAlign === "center") {
    return x + width / 2;
  }
  if (annotation.textAlign === "right") {
    return x + width - 14;
  }
  return x + 14;
}

function getCursorPath(variant: AnnotationCursorVariant): string {
  if (variant === "text") {
    return TEXT_CURSOR_PATH;
  }
  if (variant === "hand") {
    return HAND_CURSOR_PATH;
  }
  return CLICK_CURSOR_PATH;
}

function getCursorScale(variant: AnnotationCursorVariant, width: number, height: number): number {
  if (variant === "text") {
    return Math.min(width / 42, height / 42);
  }
  return Math.min(width / 42, height / 50);
}

function renderCursorMarkup(
  annotation: StepAnnotation,
  x: number,
  y: number,
  width: number,
  height: number,
  shadowFilter = "url(#annotationCursorShadow)"
): string {
  const variant = normalizeCursorVariant(annotation.cursorVariant);
  const scale = getCursorScale(variant, width, height);
  const path = getCursorPath(variant);
  const stroke = escapeHtml(annotation.color || "#111111");
  const fill = variant === "text" ? escapeHtml(annotation.color || "#ffffff") : "#ffffff";
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})" filter="${shadowFilter}">
      <path
        d="${path}"
        fill="${fill}"
        stroke="${variant === "text" ? "rgba(18,24,30,0.72)" : stroke}"
        stroke-width="${variant === "text" ? 1.8 : 2.2}"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </g>
  `;
}

function renderMagnifyBlock(
  annotation: StepAnnotation,
  imageSourceUrl: string | null | undefined
): string {
  if (!imageSourceUrl) {
    return "";
  }

  const bounds = getAnnotationBounds(annotation);
  const centerX = (bounds.x + bounds.width / 2) * 100;
  const centerY = (bounds.y + bounds.height / 2) * 100;
  const zoom = Math.max(1.2, Math.min(4, annotation.magnifyZoom ?? 1.8));
  const backgroundPositionX = 50 - centerX * zoom;
  const backgroundPositionY = 50 - centerY * zoom;
  const opacity = clampOpacity(annotation.opacity, 1);
  const shadow = annotation.shadow === false ? "none" : "0 12px 26px rgba(18,24,32,0.22)";
  const rotation = normalizeRotation(annotation.rotation);
  const transform = rotation ? `rotate(${rotation}deg)` : "none";

  return `<div
    class="stepAnnotationMagnify"
    style="left:${bounds.x * 100}%;top:${bounds.y * 100}%;width:${bounds.width * 100}%;height:${bounds.height * 100}%;border-color:${escapeHtml(
      annotation.color || "#ffffff"
    )};opacity:${opacity};box-shadow:${shadow};transform:${transform};transform-origin:center center;"
  >
    <div
      class="stepAnnotationMagnifyLens"
      style="background-image:url('${escapeHtml(imageSourceUrl)}');background-size:${zoom * 100}% ${
        zoom * 100
      }%;background-position:${backgroundPositionX}% ${backgroundPositionY}%;"
    ></div>
  </div>`;
}

function renderAssetBlock(annotation: StepAnnotation, assetUrl: string | null | undefined): string {
  if (!assetUrl) {
    return "";
  }

  const bounds = getAnnotationBounds(annotation);
  const opacity = clampOpacity(annotation.opacity, 1);
  const shadow = annotation.shadow === false ? "none" : "0 12px 26px rgba(18,24,32,0.18)";
  const rotation = normalizeRotation(annotation.rotation);
  const transform = rotation ? `rotate(${rotation}deg)` : "none";
  return `<div
    class="stepAnnotationAsset"
    style="left:${bounds.x * 100}%;top:${bounds.y * 100}%;width:${bounds.width * 100}%;height:${bounds.height * 100}%;border-radius:${
      annotation.radius ?? 14
    }px;opacity:${opacity};box-shadow:${shadow};transform:${transform};transform-origin:center center;"
  >
    <img class="stepAnnotationAssetImage" src="${escapeHtml(assetUrl)}" alt="" />
  </div>`;
}

export function createAnnotationId(): string {
  return `annotation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getAnnotationBounds(annotation: StepAnnotation): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (annotation.type === "brush") {
    return getPointsBounds(normalizePoints(annotation.points));
  }

  if (LINE_TYPES.has(annotation.type)) {
    const x1 = clampUnit(annotation.x);
    const y1 = clampUnit(annotation.y);
    const x2 = clampUnit(annotation.x2 ?? x1);
    const y2 = clampUnit(annotation.y2 ?? y1);
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.max(MIN_SIZE, Math.abs(x2 - x1)),
      height: Math.max(MIN_SIZE, Math.abs(y2 - y1))
    };
  }

  if (annotation.type === "click") {
    return {
      x: Math.max(0, clampUnit(annotation.x) - 0.03),
      y: Math.max(0, clampUnit(annotation.y) - 0.03),
      width: 0.06,
      height: 0.06
    };
  }

  const defaults = getDefaultArea(annotation.type);
  const area = normalizeArea(annotation.x, annotation.y, annotation.width ?? defaults.width, annotation.height ?? defaults.height);
  return {
    x: area.x,
    y: area.y,
    width: area.width ?? defaults.width,
    height: area.height ?? defaults.height
  };
}

export function normalizeStepAnnotation(annotation: StepAnnotation, index = 0): StepAnnotation {
  const type = annotation.type;
  const base: StepAnnotation = {
    id: annotation.id || createAnnotationId(),
    type,
    x: clampUnit(annotation.x),
    y: clampUnit(annotation.y),
    rotation: normalizeRotation(annotation.rotation),
    color: annotation.color || DEFAULT_COLOR,
    fillColor: annotation.fillColor ?? null,
    textColor: annotation.textColor || DEFAULT_TEXT_COLOR,
    backgroundColor: annotation.backgroundColor || DEFAULT_BACKGROUND,
    strokeWidth: Math.max(1, Math.round(annotation.strokeWidth ?? DEFAULT_STROKE)),
    opacity: clampOpacity(annotation.opacity, type === "highlight" ? 0.34 : 1),
    radius: clampInteger(annotation.radius, type === "magnify" ? 999 : 10, 0, 999),
    fontSize: clampInteger(annotation.fontSize, type === "tooltip" ? 15 : 16, 10, 64),
    fontWeight: clampInteger(annotation.fontWeight, 700, 300, 900),
    textAlign: normalizeTextAlign(annotation.textAlign),
    lineStyle: normalizeLineStyle(annotation.lineStyle),
    order: Number.isFinite(annotation.order) ? Math.max(0, Math.round(annotation.order ?? index)) : index,
    number: annotation.number ?? null,
    locked: annotation.locked ?? false,
    showArrowHeadStart: annotation.showArrowHeadStart ?? false,
    showArrowHeadEnd: annotation.showArrowHeadEnd ?? (type === "arrow"),
    cursorVariant: normalizeCursorVariant(annotation.cursorVariant),
    magnifyZoom: Math.max(1.2, Math.min(4, annotation.magnifyZoom ?? 1.8)),
    tooltipPlacement: normalizeTooltipPlacement(annotation.tooltipPlacement),
    blurAmount: clampInteger(annotation.blurAmount, 12, 2, 30),
    shadow: annotation.shadow ?? (type === "tooltip" || type === "magnify" || type === "asset"),
    text: annotation.text ?? null,
    x2: null,
    y2: null,
    width: null,
    height: null,
    points: annotation.points ?? null,
    asset: annotation.asset ?? null
  };

  if (type === "brush") {
    const points = normalizePoints(annotation.points);
    const bounds = getPointsBounds(points);
    return {
      ...base,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      points,
      fillColor: null,
      backgroundColor: null,
      radius: 0,
      showArrowHeadStart: false,
      showArrowHeadEnd: false
    };
  }

  if (LINE_TYPES.has(type)) {
    return {
      ...base,
      x: clampUnit(annotation.x),
      y: clampUnit(annotation.y),
      x2: clampUnit(annotation.x2 ?? annotation.x + 0.12),
      y2: clampUnit(annotation.y2 ?? annotation.y + 0.12),
      width: null,
      height: null
    };
  }

  if (type === "click") {
    return {
      ...base,
      x: clampUnit(annotation.x),
      y: clampUnit(annotation.y),
      x2: null,
      y2: null,
      width: null,
      height: null,
      text: null,
      fillColor: null,
      backgroundColor: null
    };
  }

  const defaults = getDefaultArea(type);
  const area = normalizeArea(annotation.x, annotation.y, annotation.width ?? defaults.width, annotation.height ?? defaults.height);
  const defaultFill =
    type === "highlight"
      ? "rgba(247, 196, 34, 0.34)"
      : type === "tooltip"
        ? "rgba(18,24,30,0.84)"
        : type === "magnify"
          ? "rgba(255,255,255,0.14)"
          : "rgba(255,255,255,0.06)";

  return {
    ...base,
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    fillColor: annotation.fillColor ?? defaultFill,
    text:
      type === "text"
        ? annotation.text?.trim() || "Add text"
        : type === "tooltip"
          ? annotation.text?.trim() || "Explain this area"
          : annotation.text ?? null
  };
}

export function normalizeStepAnnotations(annotations: StepAnnotation[] | null | undefined): StepAnnotation[] {
  const normalized = (annotations ?? [])
    .map((annotation, index) => normalizeStepAnnotation(annotation, index))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

  let clickNumber = 0;

  return normalized.map((annotation, index) => ({
    ...annotation,
    order: index,
    number: annotation.type === "click" ? ++clickNumber : annotation.number ?? null
  }));
}

export function withUpdatedAnnotationOrder(annotations: StepAnnotation[]): StepAnnotation[] {
  return normalizeStepAnnotations(annotations);
}

function wrapAreaRotationMarkup(
  annotation: StepAnnotation,
  width: number,
  height: number,
  markup: string
): string {
  const rotation = normalizeRotation(annotation.rotation);
  if (!rotation) {
    return markup;
  }

  const area = getAnnotationBounds(annotation);
  const cx = (area.x + area.width / 2) * width;
  const cy = (area.y + area.height / 2) * height;

  return `
    <g transform="rotate(${rotation} ${cx} ${cy})">
      ${markup}
    </g>
  `;
}

export function isAreaAnnotation(type: StepAnnotationType): boolean {
  return AREA_TYPES.has(type);
}

function renderClickMarkup(annotation: StepAnnotation, width: number, height: number): string {
  const x = clampUnit(annotation.x) * width;
  const y = clampUnit(annotation.y) * height;
  const badgeSize = Math.max(30, Math.min(42, Math.round((annotation.fontSize ?? 16) * 2)));

  return `
    <circle cx="${x}" cy="${y}" r="${badgeSize / 2}" fill="rgba(18,24,30,0.92)" stroke="rgba(255,255,255,0.92)" stroke-width="1.6" />
    <text x="${x}" y="${y + badgeSize * 0.16}" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="${Math.max(
      15,
      Math.round((annotation.fontSize ?? 16) * 1.05)
    )}" font-weight="700" fill="#ffffff">${annotation.number ?? ""}</text>
  `;
}

function renderTextLikeAnnotation(annotation: StepAnnotation, width: number, height: number, tooltip = false): string {
  const area = getAnnotationBounds(annotation);
  const x = area.x * width;
  const y = area.y * height;
  const annotationWidth = area.width * width;
  const annotationHeight = area.height * height;
  const radius = annotation.radius ?? (tooltip ? 16 : 10);
  const fill = escapeHtml(annotation.fillColor || annotation.backgroundColor || DEFAULT_BACKGROUND);
  const textColor = escapeHtml(annotation.textColor || DEFAULT_TEXT_COLOR);
  const stroke = tooltip ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.76)";
  const textY = y + Math.min(annotationHeight / 2 + (annotation.fontSize ?? 16) * 0.32, annotationHeight - 12);

  const bubbleRect = `
    <rect
      x="${x}"
      y="${y}"
      width="${annotationWidth}"
      height="${annotationHeight}"
      rx="${radius}"
      ry="${radius}"
      fill="${fill}"
      stroke="${stroke}"
      stroke-width="${tooltip ? 1 : 1.4}"
    />
  `;

  const pointerSize = Math.min(18, Math.round(annotationHeight * 0.26));
  const placement = normalizeTooltipPlacement(annotation.tooltipPlacement);
  let pointerMarkup = "";

  if (tooltip) {
    if (placement === "bottom") {
      pointerMarkup = `<path d="M${x + 28} ${y + annotationHeight} L${x + 42} ${y + annotationHeight} L${x + 35} ${
        y + annotationHeight + pointerSize
      } Z" fill="${fill}" />`;
    } else if (placement === "top") {
      pointerMarkup = `<path d="M${x + 28} ${y} L${x + 42} ${y} L${x + 35} ${y - pointerSize} Z" fill="${fill}" />`;
    } else if (placement === "left") {
      pointerMarkup = `<path d="M${x} ${y + 22} L${x} ${y + 38} L${x - pointerSize} ${y + 30} Z" fill="${fill}" />`;
    } else {
      pointerMarkup = `<path d="M${x + annotationWidth} ${y + 22} L${x + annotationWidth} ${y + 38} L${
        x + annotationWidth + pointerSize
      } ${y + 30} Z" fill="${fill}" />`;
    }
  }

  return `
    <g>
      ${bubbleRect}
      ${pointerMarkup}
      <text
        x="${getSvgTextX(annotation, x, annotationWidth)}"
        y="${textY}"
        text-anchor="${getSvgTextAnchor(annotation)}"
        font-family="Avenir Next, Arial, sans-serif"
        font-size="${annotation.fontSize ?? 16}"
        font-weight="${annotation.fontWeight ?? 700}"
        fill="${textColor}"
      >${escapeHtml(annotation.text || "")}</text>
    </g>
  `;
}

function renderSvgAnnotation(annotation: StepAnnotation, width: number, height: number): string {
  const stroke = escapeHtml(annotation.color || DEFAULT_COLOR);
  const strokeWidth = Math.max(1, annotation.strokeWidth ?? DEFAULT_STROKE);
  const fill = escapeHtml(annotation.fillColor || "rgba(255,255,255,0.08)");

  if (annotation.type === "click") {
    return renderClickMarkup(annotation, width, height);
  }

  if (annotation.type === "cursor") {
    const area = getAnnotationBounds(annotation);
    return wrapAreaRotationMarkup(
      annotation,
      width,
      height,
      renderCursorMarkup(annotation, area.x * width, area.y * height, area.width * width, area.height * height)
    );
  }

  if (annotation.type === "brush") {
    const points = normalizePoints(annotation.points)
      .map((point) => `${point.x * width},${point.y * height}`)
      .join(" ");
    const dash = annotation.lineStyle === "dashed" ? 'stroke-dasharray="12 8"' : "";
    return `
      <polyline
        points="${points}"
        fill="none"
        stroke="${stroke}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-linejoin="round"
        ${dash}
      />
    `;
  }

  if (LINE_TYPES.has(annotation.type)) {
    const x1 = clampUnit(annotation.x) * width;
    const y1 = clampUnit(annotation.y) * height;
    const x2 = clampUnit(annotation.x2 ?? annotation.x) * width;
    const y2 = clampUnit(annotation.y2 ?? annotation.y) * height;
    const dash = annotation.lineStyle === "dashed" ? 'stroke-dasharray="12 8"' : "";
    const headLength = Math.max(12, strokeWidth * 3.8);
    return `
      <line
        x1="${x1}"
        y1="${y1}"
        x2="${x2}"
        y2="${y2}"
        stroke="${stroke}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-linejoin="round"
        ${dash}
      />
      ${
        annotation.showArrowHeadStart
          ? `<polygon points="${getArrowHeadPoints(x1, y1, x2, y2, headLength, Math.PI / 7, true)}" fill="${stroke}" />`
          : ""
      }
      ${
        annotation.showArrowHeadEnd
          ? `<polygon points="${getArrowHeadPoints(x1, y1, x2, y2, headLength)}" fill="${stroke}" />`
          : ""
      }
    `;
  }

  const area = getAnnotationBounds(annotation);
  const x = area.x * width;
  const y = area.y * height;
  const annotationWidth = area.width * width;
  const annotationHeight = area.height * height;
  const radius = annotation.radius ?? 10;
  const opacity = clampOpacity(annotation.opacity, 1);

  if (annotation.type === "ellipse") {
    return wrapAreaRotationMarkup(
      annotation,
      width,
      height,
      `
      <ellipse
        cx="${x + annotationWidth / 2}"
        cy="${y + annotationHeight / 2}"
        rx="${annotationWidth / 2}"
        ry="${annotationHeight / 2}"
        fill="${fill}"
        fill-opacity="${annotation.fillColor ? opacity : 0.08}"
        stroke="${stroke}"
        stroke-width="${strokeWidth}"
      />
    `
    );
  }

  if (annotation.type === "text") {
    return wrapAreaRotationMarkup(annotation, width, height, renderTextLikeAnnotation(annotation, width, height));
  }

  if (annotation.type === "tooltip") {
    return wrapAreaRotationMarkup(annotation, width, height, renderTextLikeAnnotation(annotation, width, height, true));
  }

  if (annotation.type === "blur" || annotation.type === "magnify" || annotation.type === "asset") {
    return "";
  }

  if (annotation.type === "highlight") {
    return wrapAreaRotationMarkup(
      annotation,
      width,
      height,
      `
      <rect
        x="${x}"
        y="${y}"
        width="${annotationWidth}"
        height="${annotationHeight}"
        rx="0"
        ry="0"
        fill="${fill}"
        fill-opacity="${opacity}"
        stroke="${stroke}"
        stroke-width="${Math.max(1, strokeWidth - 1)}"
      />
    `
    );
  }

  return wrapAreaRotationMarkup(
    annotation,
    width,
    height,
    `
    <rect
      x="${x}"
      y="${y}"
      width="${annotationWidth}"
      height="${annotationHeight}"
      rx="${radius}"
      ry="${radius}"
      fill="${fill}"
      fill-opacity="${annotation.fillColor ? opacity : 0.08}"
      stroke="${stroke}"
      stroke-width="${strokeWidth}"
    />
  `
  );
}

export async function buildAnnotationOverlayMarkup(
  annotations: StepAnnotation[] | null | undefined,
  imageSize: { width: number; height: number },
  imageSourceUrl?: string | null,
  resolveAssetUrl?: (asset: StepAssetRef) => Promise<string | null> | string | null
): Promise<string> {
  const normalized = normalizeStepAnnotations(annotations);

  if (normalized.length === 0) {
    return "";
  }

  const blurBlocks = normalized
    .filter((annotation) => annotation.type === "blur")
    .map((annotation) => {
      const bounds = getAnnotationBounds(annotation);
      const rotation = normalizeRotation(annotation.rotation);
      const transform = rotation ? `rotate(${rotation}deg)` : "none";
      return `<div
        class="stepAnnotationBlur"
        style="left:${bounds.x * 100}%;top:${bounds.y * 100}%;width:${bounds.width * 100}%;height:${bounds.height * 100}%;backdrop-filter:blur(${
          annotation.blurAmount ?? 12
        }px);transform:${transform};transform-origin:center center;"
      ></div>`;
    })
    .join("");

  const magnifyBlocks = normalized
    .filter((annotation) => annotation.type === "magnify")
    .map((annotation) => renderMagnifyBlock(annotation, imageSourceUrl))
    .join("");

  const assetBlocks = (
    await Promise.all(
      normalized
        .filter((annotation) => annotation.type === "asset" && annotation.asset)
        .map(async (annotation) => {
          const assetUrl = annotation.asset
            ? await resolveAssetUrl?.(annotation.asset)
            : null;
          return renderAssetBlock(annotation, assetUrl ?? annotation.asset?.appUrl ?? annotation.asset?.fileUrl ?? null);
        })
    )
  ).join("");

  const svgMarkup = normalized
    .filter((annotation) => annotation.type !== "blur" && annotation.type !== "magnify" && annotation.type !== "asset")
    .map((annotation) => renderSvgAnnotation(annotation, imageSize.width, imageSize.height))
    .join("");

  return `
    <div class="stepAnnotationLayer" aria-hidden="true">
      ${blurBlocks}
      ${magnifyBlocks}
      ${assetBlocks}
      <svg class="stepAnnotationSvg" viewBox="0 0 ${imageSize.width} ${imageSize.height}" preserveAspectRatio="none">
        <defs>
          <filter id="annotationGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="annotationCursorShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="rgba(0,0,0,0.22)" />
          </filter>
        </defs>
        ${svgMarkup}
      </svg>
    </div>
  `;
}

export function cropStepAnnotations(
  annotations: StepAnnotation[] | null | undefined,
  selection: { x: number; y: number; width: number; height: number }
): StepAnnotation[] {
  const normalized = normalizeStepAnnotations(annotations);

  return normalized
    .map((annotation) => {
      if (annotation.type === "click") {
        const point = cropPoint({ x: annotation.x, y: annotation.y }, selection);
        if (!point) {
          return null;
        }
        return {
          ...annotation,
          x: point.x,
          y: point.y
        };
      }

      if (annotation.type === "brush") {
        const croppedPoints = normalizePoints(annotation.points)
          .map((point) => cropPoint(point, selection))
          .filter((point): point is { x: number; y: number } => Boolean(point));

        if (croppedPoints.length < 2) {
          return null;
        }

        const bounds = getPointsBounds(croppedPoints);
        return {
          ...annotation,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          points: croppedPoints
        };
      }

      if (annotation.type === "line" || annotation.type === "arrow") {
        const start = cropPoint({ x: annotation.x, y: annotation.y }, selection);
        const end = cropPoint(
          { x: annotation.x2 ?? annotation.x, y: annotation.y2 ?? annotation.y },
          selection
        );
        if (!start || !end) {
          return null;
        }
        return {
          ...annotation,
          x: start.x,
          y: start.y,
          x2: end.x,
          y2: end.y
        };
      }

      const bounds = getAnnotationBounds(annotation);
      const left = Math.max(bounds.x, selection.x);
      const top = Math.max(bounds.y, selection.y);
      const right = Math.min(bounds.x + bounds.width, selection.x + selection.width);
      const bottom = Math.min(bounds.y + bounds.height, selection.y + selection.height);

      if (right <= left || bottom <= top) {
        return null;
      }

      return {
        ...annotation,
        x: clampUnit((left - selection.x) / selection.width),
        y: clampUnit((top - selection.y) / selection.height),
        width: clampMinUnit((right - left) / selection.width),
        height: clampMinUnit((bottom - top) / selection.height)
      };
    })
    .filter((annotation): annotation is StepAnnotation => Boolean(annotation))
    .map((annotation, index) => ({
      ...annotation,
      order: index
    }));
}

export function translateBrushAnnotation(
  annotation: StepAnnotation,
  dx: number,
  dy: number
): StepAnnotation {
  const points = translatePoints(normalizePoints(annotation.points), dx, dy);
  const bounds = getPointsBounds(points);
  return {
    ...annotation,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points
  };
}

export function resizeBrushAnnotation(
  annotation: StepAnnotation,
  nextBounds: { x: number; y: number; width: number; height: number }
): StepAnnotation {
  const points = scalePointsToBounds(normalizePoints(annotation.points), nextBounds);
  const bounds = getPointsBounds(points);
  return {
    ...annotation,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points
  };
}
