export interface ActiveWindowContext {
  appName: string | null;
  windowTitle: string | null;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface InteractionContainer {
  kind: "window" | "display";
  label: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface StepNarrativeInput {
  stepNumber: number;
  clickIndex?: number | null;
  button: string;
  clicks: number;
  screenX: number;
  screenY: number;
  displayLabel: string;
  activeWindow?: ActiveWindowContext | null;
  container: InteractionContainer;
}

export interface StepNarrative {
  title: string;
  notes: string;
  contextLabel: string | null;
  appName: string | null;
  windowTitle: string | null;
  areaLabel: string;
}

type InteractionRegion = {
  code:
    | "window-navigation"
    | "top-toolbar"
    | "left-sidebar"
    | "right-panel"
    | "bottom-actions"
    | "main-workspace";
  label: string;
  titleVerb: string;
  expectedOutcome: string;
};

const GENERIC_TITLE_TOKENS = new Set([
  "google chrome",
  "chrome",
  "microsoft edge",
  "edge",
  "safari",
  "codex",
  "easydo",
  "electron",
  "finder"
]);

function padStepNumber(value: number): string {
  return String(value).padStart(2, "0");
}

function cleanToken(token: string): string {
  return token.replace(/\s+/g, " ").trim();
}

export function normalizeWindowTitle(
  rawWindowTitle: string | null | undefined,
  appName: string | null | undefined
): string | null {
  const windowTitle = cleanToken(rawWindowTitle ?? "");
  if (!windowTitle) {
    return null;
  }

  const appLabel = cleanToken(appName ?? "");
  let normalized = windowTitle;

  if (appLabel) {
    const suffixPatterns = [
      ` - ${appLabel}`,
      ` | ${appLabel}`,
      ` — ${appLabel}`,
      ` · ${appLabel}`
    ];
    const prefixPatterns = [
      `${appLabel} - `,
      `${appLabel} | `,
      `${appLabel} — `,
      `${appLabel} · `
    ];

    for (const suffix of suffixPatterns) {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.slice(0, -suffix.length).trim();
      }
    }

    for (const prefix of prefixPatterns) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.slice(prefix.length).trim();
      }
    }
  }

  if (!normalized || normalized.toLowerCase() === appLabel.toLowerCase()) {
    return appLabel || null;
  }

  return normalized;
}

export function resolveInteractionContainer(
  screenX: number,
  screenY: number,
  displayBounds: { x: number; y: number; width: number; height: number },
  displayLabel: string,
  activeWindow?: ActiveWindowContext | null
): InteractionContainer {
  const windowBounds = activeWindow?.bounds;
  if (
    windowBounds &&
    screenX >= windowBounds.x &&
    screenX <= windowBounds.x + windowBounds.width &&
    screenY >= windowBounds.y &&
    screenY <= windowBounds.y + windowBounds.height &&
    windowBounds.width > 0 &&
    windowBounds.height > 0
  ) {
    return {
      kind: "window",
      label: normalizeWindowTitle(activeWindow?.windowTitle, activeWindow?.appName) ||
        activeWindow?.appName ||
        displayLabel,
      bounds: windowBounds
    };
  }

  return {
    kind: "display",
    label: displayLabel,
    bounds: displayBounds
  };
}

function inferInteractionRegion(
  screenX: number,
  screenY: number,
  container: InteractionContainer,
  button: string,
  clicks: number
): InteractionRegion {
  if (button === "right click") {
    return {
      code: "main-workspace",
      label: "context menu target area",
      titleVerb: "Open the context menu",
      expectedOutcome: "a context menu or quick action panel should appear"
    };
  }

  if (clicks > 1) {
    return {
      code: "main-workspace",
      label: "target item area",
      titleVerb: "Open the selected item",
      expectedOutcome: "the target item should open, expand, or gain focus"
    };
  }

  const relativeX = (screenX - container.bounds.x) / container.bounds.width;
  const relativeY = (screenY - container.bounds.y) / container.bounds.height;

  if (relativeY <= 0.12 && relativeX <= 0.22) {
    return {
      code: "window-navigation",
      label: "window navigation area",
      titleVerb: "Use the navigation control",
      expectedOutcome: "the current view should navigate, switch, or refocus"
    };
  }

  if (relativeY <= 0.18) {
    return {
      code: "top-toolbar",
      label: "top toolbar",
      titleVerb: "Use the top toolbar control",
      expectedOutcome: "the visible page, filter state, or open panel should update"
    };
  }

  if (relativeX <= 0.22) {
    return {
      code: "left-sidebar",
      label: "left navigation area",
      titleVerb: "Select the target item",
      expectedOutcome: "the active section or highlighted selection should change"
    };
  }

  if (relativeX >= 0.78) {
    return {
      code: "right-panel",
      label: "right-side panel",
      titleVerb: "Adjust the side panel option",
      expectedOutcome: "the detail panel should update or reveal more information"
    };
  }

  if (relativeY >= 0.82) {
    return {
      code: "bottom-actions",
      label: "bottom action area",
      titleVerb: "Use the bottom action",
      expectedOutcome: "the flow should continue, confirm, submit, or reset"
    };
  }

  return {
    code: "main-workspace",
    label: "main workspace",
    titleVerb: "Click the target control",
    expectedOutcome: "the main content should respond, open, or change focus"
  };
}

function chooseContextLabel(input: StepNarrativeInput): string | null {
  const rawContext = normalizeWindowTitle(
    input.activeWindow?.windowTitle,
    input.activeWindow?.appName
  );

  if (!rawContext) {
    return input.activeWindow?.appName ? cleanToken(input.activeWindow.appName) : null;
  }

  const compact = cleanToken(rawContext);
  if (!compact) {
    return input.activeWindow?.appName ? cleanToken(input.activeWindow.appName) : null;
  }

  const parts = compact
    .split(/\s[|·—]\s|\s-\s/)
    .map((part) => cleanToken(part))
    .filter(Boolean);

  const appName = cleanToken(input.activeWindow?.appName ?? "").toLowerCase();
  const usefulParts = parts.filter((part) => {
    const value = part.toLowerCase();
    return value !== appName && !GENERIC_TITLE_TOKENS.has(value);
  });

  if (usefulParts.length > 0) {
    return usefulParts.slice(0, 2).join(" / ");
  }

  return compact;
}

export function buildStepNarrative(input: StepNarrativeInput): StepNarrative {
  const region = inferInteractionRegion(
    input.screenX,
    input.screenY,
    input.container,
    input.button,
    input.clicks
  );
  const contextLabel = chooseContextLabel(input);
  const appName = cleanToken(input.activeWindow?.appName ?? "") || null;
  const windowTitle = normalizeWindowTitle(input.activeWindow?.windowTitle, appName);
  const titleSuffix = contextLabel ? ` in ${contextLabel}` : appName ? ` in ${appName}` : "";
  const clickPrefix = input.clickIndex ? `Click #${input.clickIndex}` : "This interaction";
  const whereText =
    input.container.kind === "window"
      ? `the ${region.label} of ${input.container.label}`
      : `the ${region.label} on ${input.displayLabel}`;
  const windowText =
    appName && windowTitle && windowTitle !== appName
      ? `Recorded in ${appName}, window "${windowTitle}".`
      : appName
        ? `Recorded in ${appName}.`
        : `Recorded on ${input.displayLabel}.`;

  return {
    title: `Step ${padStepNumber(input.stepNumber)}. ${region.titleVerb}${titleSuffix}`,
    notes: `${clickPrefix} was captured in ${whereText}. ${windowText} Use this step to replace the placeholder control name with the exact label the operator should click, then verify that ${region.expectedOutcome}.`,
    contextLabel,
    appName,
    windowTitle,
    areaLabel: region.label
  };
}
