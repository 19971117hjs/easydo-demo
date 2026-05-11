import { contextBridge, ipcRenderer } from "electron";
import type {
  CaptureOverlayPayload,
  CaptureStudioPayload,
  CaptureTargetMode,
  CaptureState,
  CaptureStepInput,
  ClickStreamStatus,
  CreateFolderInput,
  CreateProjectInput,
  DeleteFolderInput,
  DeleteProjectsInput,
  DuplicateProjectInput,
  EasyDoApi,
  EditorUiPrefs,
  ExportHtmlInput,
  MoveProjectsInput,
  RenameFolderInput,
  SaveProjectInput,
  UpdateProjectMetaInput
} from "@shared/contracts";

const api: EasyDoApi = {
  app: {
    getOverview: () => ipcRenderer.invoke("app:get-overview"),
    getEditorUiPrefs: (): Promise<EditorUiPrefs> => ipcRenderer.invoke("app:get-editor-ui-prefs"),
    patchEditorUiPrefs: (patch) => ipcRenderer.invoke("app:patch-editor-ui-prefs", patch),
    writeClipboardText: (text) => ipcRenderer.invoke("app:write-clipboard-text", text)
  },
  capture: {
    getState: () => ipcRenderer.invoke("capture:get-state"),
    getPermissions: () => ipcRenderer.invoke("capture:get-permissions"),
    prepare: (mode) => ipcRenderer.invoke("capture:prepare", mode),
    start: (mode) => ipcRenderer.invoke("capture:start", mode),
    pause: () => ipcRenderer.invoke("capture:pause"),
    stop: () => ipcRenderer.invoke("capture:stop"),
    captureStep: (input: CaptureStepInput) => ipcRenderer.invoke("capture:capture-step", input),
    beginAreaSelection: (input: CaptureStepInput) =>
      ipcRenderer.invoke("capture:begin-area-selection", input),
    getOverlayPayload: (): Promise<CaptureOverlayPayload | null> =>
      ipcRenderer.invoke("capture:get-overlay-payload"),
    getStudioPayload: (): Promise<CaptureStudioPayload | null> =>
      ipcRenderer.invoke("capture:get-studio-payload"),
    confirmOverlaySelection: (rect) =>
      ipcRenderer.invoke("capture:confirm-overlay-selection", rect),
    continueOverlayClickStream: () => ipcRenderer.invoke("capture:continue-overlay-click-stream"),
    cancelOverlaySelection: () => ipcRenderer.invoke("capture:cancel-overlay-selection"),
    startClickStream: (input: CaptureStepInput) =>
      ipcRenderer.invoke("capture:start-click-stream", input),
    startStudioCapture: () => ipcRenderer.invoke("capture:start-studio-capture"),
    pauseStudioCapture: () => ipcRenderer.invoke("capture:pause-studio-capture"),
    resumeStudioCapture: () => ipcRenderer.invoke("capture:resume-studio-capture"),
    finishStudioCapture: () => ipcRenderer.invoke("capture:finish-studio-capture"),
    setStudioCaptureMode: (mode: CaptureTargetMode) =>
      ipcRenderer.invoke("capture:set-studio-capture-mode", mode),
    setStudioSelectionRect: (rect) =>
      ipcRenderer.invoke("capture:set-studio-selection-rect", rect),
    setStudioCropperVisible: (visible: boolean) =>
      ipcRenderer.invoke("capture:set-studio-cropper-visible", visible),
    acceptOverlayMouse: () => ipcRenderer.send("capture:accept-overlay-mouse"),
    ignoreOverlayMouse: () => ipcRenderer.send("capture:ignore-overlay-mouse"),
    updateStudioLatestStep: (input) => ipcRenderer.invoke("capture:update-studio-latest-step", input),
    deleteStudioLatestStep: () => ipcRenderer.invoke("capture:delete-studio-latest-step"),
    stopClickStream: () => ipcRenderer.invoke("capture:stop-click-stream"),
    onStateChanged: (listener) => {
      const wrapped = (_event: Electron.IpcRendererEvent, state: CaptureState) => {
        listener(state);
      };
      ipcRenderer.on("capture:state-changed", wrapped);
      return () => {
        ipcRenderer.removeListener("capture:state-changed", wrapped);
      };
    },
    onAutoStepCreated: (listener) => {
      const wrapped = (_event: Electron.IpcRendererEvent, result: unknown) => {
        listener(result as import("@shared/contracts").CaptureStepResult);
      };
      ipcRenderer.on("capture:auto-step-created", wrapped);
      return () => {
        ipcRenderer.removeListener("capture:auto-step-created", wrapped);
      };
    },
    onClickStreamStatus: (listener) => {
      const wrapped = (_event: Electron.IpcRendererEvent, status: ClickStreamStatus) => {
        listener(status);
      };
      ipcRenderer.on("capture:click-stream-status", wrapped);
      return () => {
        ipcRenderer.removeListener("capture:click-stream-status", wrapped);
      };
    },
    onClickStreamError: (listener) => {
      const wrapped = (_event: Electron.IpcRendererEvent, message: string) => {
        listener(message);
      };
      ipcRenderer.on("capture:click-stream-error", wrapped);
      return () => {
        ipcRenderer.removeListener("capture:click-stream-error", wrapped);
      };
    },
    onClickStreamProgress: (listener) => {
      const wrapped = (
        _event: Electron.IpcRendererEvent,
        progress: import("@shared/contracts").ClickStreamProgress
      ) => {
        listener(progress);
      };
      ipcRenderer.on("capture:click-stream-progress", wrapped);
      return () => {
        ipcRenderer.removeListener("capture:click-stream-progress", wrapped);
      };
    },
    onStudioChanged: (listener) => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: CaptureStudioPayload | null) => {
        listener(payload);
      };
      ipcRenderer.on("capture:studio-changed", wrapped);
      return () => {
        ipcRenderer.removeListener("capture:studio-changed", wrapped);
      };
    }
  },
  projects: {
    getLibrary: () => ipcRenderer.invoke("projects:get-library"),
    load: (id) => ipcRenderer.invoke("projects:load", id),
    save: (input: SaveProjectInput) => ipcRenderer.invoke("projects:save", input),
    createEmpty: (input?: CreateProjectInput) => ipcRenderer.invoke("projects:create-empty", input),
    updateMeta: (input: UpdateProjectMetaInput) => ipcRenderer.invoke("projects:update-meta", input),
    duplicate: (input: DuplicateProjectInput) => ipcRenderer.invoke("projects:duplicate", input),
    deleteMany: (input: DeleteProjectsInput) => ipcRenderer.invoke("projects:delete-many", input),
    moveMany: (input: MoveProjectsInput) => ipcRenderer.invoke("projects:move-many", input),
    importImages: (input) => ipcRenderer.invoke("projects:import-images", input),
    importAnnotationAsset: (input) => ipcRenderer.invoke("projects:import-annotation-asset", input),
    getOcrLanguages: () => ipcRenderer.invoke("projects:get-ocr-languages"),
    recognizeStepText: (input) => ipcRenderer.invoke("projects:recognize-step-text", input),
    cropStepAsset: (input) => ipcRenderer.invoke("projects:crop-step-asset", input),
    restoreStepAsset: (input) => ipcRenderer.invoke("projects:restore-step-asset", input),
    createFolder: (input: CreateFolderInput) => ipcRenderer.invoke("projects:create-folder", input),
    renameFolder: (input: RenameFolderInput) => ipcRenderer.invoke("projects:rename-folder", input),
    deleteFolder: (input: DeleteFolderInput) => ipcRenderer.invoke("projects:delete-folder", input)
  },
  exports: {
    previewHtml: (input: ExportHtmlInput) => ipcRenderer.invoke("exports:preview-html", input),
    exportHtml: (input: ExportHtmlInput) => ipcRenderer.invoke("exports:html", input),
    openPath: (absolutePath: string) => ipcRenderer.invoke("exports:open-path", absolutePath)
  }
};

contextBridge.exposeInMainWorld("easydo", api);
