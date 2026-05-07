import { computed, onMounted, onUnmounted, ref } from "vue";
import type { CaptureStatus, ClickStreamStatus, PermissionState } from "@shared/contracts";
import { useWorkbenchStore } from "@renderer/stores/workbench";
import { resolveAssetUrl } from "@renderer/utils/asset-url";
import type {
  RecorderBadge,
  RecorderMetric,
  RecorderPermissionItem,
  RecorderPreviewSummary,
  RecorderTone
} from "./types";

function formatCaptureStatus(status: CaptureStatus | undefined): string {
  switch (status) {
    case "preparing":
      return "Preparing";
    case "recording":
      return "Recording";
    case "paused":
      return "Paused";
    case "stopped":
      return "Stopped";
    case "idle":
    default:
      return "Idle";
  }
}

function formatMode(mode: "guide" | "screenshot" | undefined): string {
  return mode === "screenshot" ? "Single screenshot" : "Guide capture";
}

function formatClickStatus(status: ClickStreamStatus): string {
  switch (status) {
    case "handoff":
      return "Choose Screen";
    case "setup":
      return "Choose Capture";
    case "paused":
      return "Paused";
    case "warming-up":
      return "Warming up";
    case "ignored-main-window":
      return "Ignoring easyDo window";
    case "ignored-control-window":
      return "Ignoring capture controls";
    default:
      return status
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
  }
}

function formatPermissionValue(status: PermissionState): string {
  switch (status) {
    case "granted":
      return "Granted";
    case "denied":
      return "Needs attention";
    case "unsupported":
    default:
      return "Unsupported";
  }
}

function mapCaptureTone(status: CaptureStatus | undefined): RecorderTone {
  if (status === "recording") {
    return "success";
  }
  if (status === "paused" || status === "preparing") {
    return "warning";
  }
  if (status === "stopped") {
    return "danger";
  }
  return "neutral";
}

function mapClickTone(status: ClickStreamStatus): RecorderTone {
  if (
    status === "handoff" ||
    status === "setup" ||
    status === "paused" ||
    status === "armed" ||
    status === "capturing" ||
    status === "queued" ||
    status === "draining"
  ) {
    return "accent";
  }
  if (status === "debounced" || status === "warming-up") {
    return "warning";
  }
  if (status === "stopped") {
    return "danger";
  }
  return "neutral";
}

function mapPermissionTone(status: PermissionState): RecorderTone {
  if (status === "granted") {
    return "success";
  }
  if (status === "denied") {
    return "warning";
  }
  return "neutral";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function useRecorderWorkspace() {
  const workbench = useWorkbenchStore();
  const captureTitle = ref("");
  const captureNotes = ref("");
  const isBootstrapping = ref(true);
  const actionPending = ref(false);

  let stopListening: (() => void) | null = null;
  let stopAutoSteps: (() => void) | null = null;
  let stopClickStatus: (() => void) | null = null;
  let stopClickError: (() => void) | null = null;
  let stopClickProgress: (() => void) | null = null;

  function bindListeners(): void {
    if (stopListening) {
      return;
    }

    stopListening = workbench.listenCaptureState();
    stopAutoSteps = workbench.listenAutoStepCreated();
    stopClickStatus = workbench.listenClickStreamStatus();
    stopClickError = workbench.listenClickStreamError();
    stopClickProgress = workbench.listenClickStreamProgress();
  }

  function unbindListeners(): void {
    stopListening?.();
    stopAutoSteps?.();
    stopClickStatus?.();
    stopClickError?.();
    stopClickProgress?.();
    stopListening = null;
    stopAutoSteps = null;
    stopClickStatus = null;
    stopClickError = null;
    stopClickProgress = null;
  }

  async function runAction(task: () => Promise<void>): Promise<void> {
    if (actionPending.value) {
      return;
    }

    actionPending.value = true;
    try {
      await task();
    } finally {
      actionPending.value = false;
    }
  }

  onMounted(async () => {
    try {
      await workbench.bootstrap();
      bindListeners();
    } finally {
      isBootstrapping.value = false;
    }
  });

  onUnmounted(() => {
    unbindListeners();
  });

  const captureState = computed(() => workbench.captureState);
  const permissionSnapshot = computed(() => workbench.permissionSnapshot);
  const project = computed(() => workbench.currentProject);
  const clickStreamStatus = computed(() => workbench.clickStreamStatus);
  const clickStreamActive = computed(
    () => workbench.clickStreamStatus !== "idle" && workbench.clickStreamStatus !== "stopped"
  );
  const canCaptureScreens = computed(() => permissionSnapshot.value?.canCaptureScreens ?? false);
  const canStartSession = computed(() =>
    canCaptureScreens.value &&
    ["idle", "paused", "stopped"].includes(captureState.value?.status ?? "idle")
  );
  const canPauseSession = computed(() => captureState.value?.status === "recording");
  const canStopSession = computed(
    () => clickStreamActive.value || !["idle", "stopped"].includes(captureState.value?.status ?? "idle")
  );
  const canStartClickStream = computed(() => canCaptureScreens.value && !clickStreamActive.value);
  const canCaptureNow = computed(() => canCaptureScreens.value);
  const guideName = computed(() => project.value?.name || "New guide");
  const guideMeta = computed(() => {
    const stepCount = project.value?.steps.length ?? 0;
    return `${stepCount} ${stepCount === 1 ? "step" : "steps"} ready`;
  });

  const heroBadges = computed<RecorderBadge[]>(() => [
    {
      label: "Session",
      value: formatCaptureStatus(captureState.value?.status),
      tone: mapCaptureTone(captureState.value?.status)
    },
    {
      label: "Mode",
      value: formatMode(captureState.value?.mode),
      tone: "neutral"
    },
    {
      label: "Click Stream",
      value: formatClickStatus(clickStreamStatus.value),
      tone: mapClickTone(clickStreamStatus.value)
    }
  ]);

  const permissionItems = computed<RecorderPermissionItem[]>(() => {
    const permissions = permissionSnapshot.value;

    return [
      {
        id: "screen",
        label: "Screen Recording",
        value: formatPermissionValue(permissions?.screenRecording ?? "unsupported"),
        summary:
          permissions?.screenRecording === "granted"
            ? "Screen capture is available for full-screen and area workflows."
            : "Grant screen recording to enable screenshots, area selection, and click capture.",
        tone: mapPermissionTone(permissions?.screenRecording ?? "unsupported")
      },
      {
        id: "accessibility",
        label: "Accessibility",
        value: formatPermissionValue(permissions?.accessibility ?? "unsupported"),
        summary:
          permissions?.accessibility === "granted"
            ? "Input monitoring is available for click-stream assisted capture."
            : "Grant accessibility access to arm click-stream capture and auto-step creation.",
        tone: mapPermissionTone(permissions?.accessibility ?? "unsupported")
      }
    ];
  });

  const activityMetrics = computed<RecorderMetric[]>(() => [
    {
      label: "Accepted",
      value: String(workbench.clickStreamProgress.acceptedCount),
      hint: "Clicks accepted into the queue",
      tone: "accent"
    },
    {
      label: "Queued",
      value: String(workbench.clickStreamProgress.queuedCount),
      hint: "Captures waiting to finish",
      tone: "warning"
    },
    {
      label: "Captured",
      value: String(workbench.clickStreamProgress.completedCount),
      hint: "Steps already appended",
      tone: "success"
    },
    {
      label: "Last Event",
      value: formatDateTime(workbench.clickStreamProgress.lastEventAt),
      hint: "Latest click seen by the recorder",
      tone: "neutral"
    }
  ]);

  const latestCapture = computed<RecorderPreviewSummary | null>(() => {
    const result = workbench.lastCaptureResult;
    if (!result) {
      return null;
    }

    return {
      title: result.capturedStep.title,
      imageUrl: result.asset.appUrl || resolveAssetUrl(result.asset),
      badges: [
        `Step ${String(result.capturedStep.stepNumber ?? "?").padStart(2, "0")}`,
        result.capturedStep.clickIndex
          ? `Click ${String(result.capturedStep.clickIndex).padStart(2, "0")}`
          : "Manual capture",
        result.capturedStep.contextLabel || result.asset.displayLabel
      ],
      details: [
        `${result.asset.width} × ${result.asset.height}`,
        formatDateTime(result.capturedStep.capturedAt ?? result.asset.createdAt),
        result.capturedStep.windowTitle || result.capturedStep.appName || "Captured context"
      ],
      absolutePath: result.asset.absolutePath
    };
  });

  const statusNarrative = computed(() => {
    if (!permissionSnapshot.value?.canCaptureScreens) {
      return "Recorder is blocked by macOS permissions. Fix permissions first so the rebuilt shell behaves like a real product page, not a debug surface.";
    }

    if (clickStreamActive.value) {
      return "Click stream is active. Switch to the target app and perform the workflow once; easyDo will keep queuing screenshots and step suggestions.";
    }

    if (captureState.value?.status === "recording") {
      return "Recorder session is active. Use simple screenshot or area selection to append the next polished step.";
    }

    if (latestCapture.value) {
      return "Latest capture landed successfully. Review the preview, then continue in Recorder or jump into the Editor for annotations.";
    }

    return "This Recorder rebuild focuses on one clean path: confirm permissions, capture the next step, and verify the latest result immediately.";
  });

  const checkedAtLabel = computed(() => formatDateTime(permissionSnapshot.value?.checkedAt));
  const activityMessage = computed(() => workbench.clickStreamError || workbench.saveMessage);

  async function startRecording(): Promise<void> {
    await runAction(() => workbench.startCapture("guide"));
  }

  async function pauseRecording(): Promise<void> {
    await runAction(() => workbench.pauseCapture());
  }

  async function stopRecording(): Promise<void> {
    await runAction(() => workbench.stopCapture());
  }

  async function captureCurrentScreen(): Promise<void> {
    await runAction(() => workbench.captureCurrentStep(captureTitle.value, captureNotes.value));
  }

  async function selectArea(): Promise<void> {
    await runAction(() => workbench.beginAreaSelection(captureTitle.value, captureNotes.value));
  }

  async function refreshPermissions(): Promise<void> {
    await runAction(() => workbench.refreshPermissions());
  }

  async function startClickStream(): Promise<void> {
    await runAction(() => workbench.startClickStream(captureTitle.value, captureNotes.value));
  }

  async function stopClickStream(): Promise<void> {
    await runAction(() => workbench.stopClickStream());
  }

  return {
    actionPending,
    activityMessage,
    activityMetrics,
    canCaptureNow,
    canPauseSession,
    canStartClickStream,
    canStartSession,
    canStopSession,
    captureNotes,
    captureTitle,
    checkedAtLabel,
    clickStreamActive,
    guideMeta,
    guideName,
    heroBadges,
    isBootstrapping,
    latestCapture,
    permissionItems,
    permissionNotes: computed(() => permissionSnapshot.value?.notes ?? []),
    statusNarrative,
    workbench,
    captureCurrentScreen,
    pauseRecording,
    refreshPermissions,
    selectArea,
    startClickStream,
    startRecording,
    stopClickStream,
    stopRecording
  };
}
