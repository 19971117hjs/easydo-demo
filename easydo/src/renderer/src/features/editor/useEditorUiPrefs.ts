import { computed, onUnmounted, ref, watch } from "vue";
import type { EditorUiPrefs } from "@shared/contracts";

const DEFAULT_EDITOR_UI_PREFS: EditorUiPrefs = {
  appUiEditorLeftSidebarWidth: 248,
  appUiEditorRightSidebarWidth: 340,
  appUiEditorLeftSidebarOpened: true,
  appUiEditorRightSidebarOpened: true,
  appSettingFocusedViewForNewGuides: true,
  appUiStepsListGridView: true
};

const LEFT_MIN = 220;
const LEFT_MAX = 420;
const RIGHT_MIN = 280;
const RIGHT_MAX = 460;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useEditorUiPrefs() {
  const leftCollapsed = ref(!DEFAULT_EDITOR_UI_PREFS.appUiEditorLeftSidebarOpened);
  const rightCollapsed = ref(!DEFAULT_EDITOR_UI_PREFS.appUiEditorRightSidebarOpened);
  const focusedViewEnabled = ref(DEFAULT_EDITOR_UI_PREFS.appSettingFocusedViewForNewGuides);
  const leftSidebarWidth = ref(DEFAULT_EDITOR_UI_PREFS.appUiEditorLeftSidebarWidth);
  const rightSidebarWidth = ref(DEFAULT_EDITOR_UI_PREFS.appUiEditorRightSidebarWidth);
  const stepsListGridView = ref(DEFAULT_EDITOR_UI_PREFS.appUiStepsListGridView);
  const prefsReady = ref(false);

  let isHydrating = true;
  let saveTimer: number | null = null;
  let pendingPatch: Partial<EditorUiPrefs> = {};
  let activeCleanup: (() => void) | null = null;

  const editorBodyStyle = computed(() => ({
    "--steps-width": leftCollapsed.value ? "18px" : `${leftSidebarWidth.value}px`,
    "--details-width": rightCollapsed.value ? "18px" : `${rightSidebarWidth.value}px`
  }));

  function schedulePersist(patch: Partial<EditorUiPrefs>): void {
    pendingPatch = {
      ...pendingPatch,
      ...patch
    };

    if (isHydrating) {
      return;
    }

    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }

    saveTimer = window.setTimeout(async () => {
      const nextPatch = pendingPatch;
      pendingPatch = {};
      saveTimer = null;
      await window.easydo.app.patchEditorUiPrefs(nextPatch);
    }, 120);
  }

  function beginResize(side: "left" | "right", event: PointerEvent): void {
    const startX = event.clientX;
    const startWidth = side === "left" ? leftSidebarWidth.value : rightSidebarWidth.value;

    activeCleanup?.();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      if (side === "left") {
        leftSidebarWidth.value = clamp(startWidth + delta, LEFT_MIN, LEFT_MAX);
        return;
      }

      rightSidebarWidth.value = clamp(startWidth - delta, RIGHT_MIN, RIGHT_MAX);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      activeCleanup = null;
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    activeCleanup = handlePointerUp;
  }

  async function loadPrefs(): Promise<void> {
    isHydrating = true;

    try {
      const prefs = await window.easydo.app.getEditorUiPrefs();
      leftSidebarWidth.value = clamp(prefs.appUiEditorLeftSidebarWidth, LEFT_MIN, LEFT_MAX);
      rightSidebarWidth.value = clamp(prefs.appUiEditorRightSidebarWidth, RIGHT_MIN, RIGHT_MAX);
      leftCollapsed.value = !prefs.appUiEditorLeftSidebarOpened;
      rightCollapsed.value = !prefs.appUiEditorRightSidebarOpened;
      focusedViewEnabled.value = prefs.appSettingFocusedViewForNewGuides;
      stepsListGridView.value = prefs.appUiStepsListGridView;
    } finally {
      prefsReady.value = true;
      isHydrating = false;
    }
  }

  watch(leftSidebarWidth, (value) => {
    schedulePersist({ appUiEditorLeftSidebarWidth: clamp(value, LEFT_MIN, LEFT_MAX) });
  });

  watch(rightSidebarWidth, (value) => {
    schedulePersist({ appUiEditorRightSidebarWidth: clamp(value, RIGHT_MIN, RIGHT_MAX) });
  });

  watch(leftCollapsed, (value) => {
    schedulePersist({ appUiEditorLeftSidebarOpened: !value });
  });

  watch(rightCollapsed, (value) => {
    schedulePersist({ appUiEditorRightSidebarOpened: !value });
  });

  watch(focusedViewEnabled, (value) => {
    schedulePersist({ appSettingFocusedViewForNewGuides: value });
  });

  watch(stepsListGridView, (value) => {
    schedulePersist({ appUiStepsListGridView: value });
  });

  onUnmounted(() => {
    activeCleanup?.();
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }
  });

  return {
    beginResize,
    editorBodyStyle,
    focusedViewEnabled,
    leftCollapsed,
    loadPrefs,
    prefsReady,
    rightCollapsed,
    stepsListGridView
  };
}
