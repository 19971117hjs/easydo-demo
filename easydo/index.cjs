"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const node_events = require("node:events");
const node_fs = require("node:fs");
const path = require("node:path");
const node_module = require("node:module");
const promises = require("node:fs/promises");
const node_url = require("node:url");
const sharp = require("sharp");
function registerAppIpc(appUiService2) {
  electron.ipcMain.handle("app:get-overview", () => ({
    name: electron.app.getName(),
    version: electron.app.getVersion(),
    platform: process.platform,
    userDataPath: electron.app.getPath("userData"),
    isPackaged: electron.app.isPackaged,
    runtimeIdentity: electron.app.getName(),
    execPath: process.execPath,
    appPath: electron.app.getAppPath()
  }));
  electron.ipcMain.handle("app:get-editor-ui-prefs", () => appUiService2.getEditorUiPrefs());
  electron.ipcMain.handle(
    "app:patch-editor-ui-prefs",
    (_event, patch) => appUiService2.patchEditorUiPrefs(patch)
  );
  electron.ipcMain.handle("app:write-clipboard-text", (_event, text) => {
    electron.clipboard.writeText(text);
  });
}
function registerAssetProtocol() {
  electron.protocol.registerFileProtocol("easydo-asset", (request, callback) => {
    const url = new URL(request.url);
    const encodedPath = `${url.hostname}${url.pathname}`.replace(/^local\/?/, "");
    const absolutePath = decodeURIComponent(
      encodedPath.startsWith("/") ? encodedPath : `/${encodedPath}`
    );
    callback(absolutePath);
  });
}
function broadcast(target, state) {
  target.send("capture:state-changed", state);
}
function broadcastToAll(channel, payload) {
  for (const window of electron.BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}
function registerCaptureIpc(captureService2, permissionsService2, screenCaptureService2, clickStreamService2, getWebContents) {
  electron.ipcMain.handle("capture:get-state", () => captureService2.getState());
  electron.ipcMain.handle("capture:get-permissions", () => permissionsService2.getSnapshot());
  electron.ipcMain.handle(
    "capture:prepare",
    (_event, mode) => captureService2.prepare(mode)
  );
  electron.ipcMain.handle(
    "capture:start",
    (_event, mode) => captureService2.start(mode)
  );
  electron.ipcMain.handle("capture:pause", () => captureService2.pause());
  electron.ipcMain.handle("capture:stop", () => captureService2.stop());
  electron.ipcMain.handle(
    "capture:capture-step",
    (_event, input) => screenCaptureService2.captureStep(input)
  );
  electron.ipcMain.handle(
    "capture:begin-area-selection",
    (_event, input) => screenCaptureService2.beginAreaSelection(input)
  );
  electron.ipcMain.handle("capture:get-overlay-payload", () => screenCaptureService2.getOverlayPayload());
  electron.ipcMain.handle("capture:get-studio-payload", () => screenCaptureService2.getStudioPayload());
  electron.ipcMain.handle(
    "capture:confirm-overlay-selection",
    (_event, rect) => screenCaptureService2.confirmOverlaySelection(rect)
  );
  electron.ipcMain.handle(
    "capture:continue-overlay-click-stream",
    () => screenCaptureService2.continueOverlayClickStream()
  );
  electron.ipcMain.handle(
    "capture:cancel-overlay-selection",
    () => screenCaptureService2.cancelAreaSelection()
  );
  electron.ipcMain.handle(
    "capture:start-click-stream",
    (_event, input) => screenCaptureService2.beginClickStreamHandoff(input)
  );
  electron.ipcMain.handle("capture:start-studio-capture", async () => {
    const input = screenCaptureService2.getStudioCaptureInput();
    if (!input) {
      throw new Error("No click capture studio session is ready to start.");
    }
    screenCaptureService2.prepareStudioForRecording();
    try {
      return await clickStreamService2.startSession(input);
    } catch (error) {
      screenCaptureService2.pauseStudioSession();
      throw error;
    }
  });
  electron.ipcMain.handle("capture:pause-studio-capture", () => {
    screenCaptureService2.pauseStudioSession();
    return clickStreamService2.pauseSession();
  });
  electron.ipcMain.handle("capture:resume-studio-capture", () => {
    screenCaptureService2.resumeStudioSession();
    return clickStreamService2.resumeSession();
  });
  electron.ipcMain.handle("capture:finish-studio-capture", () => {
    if (clickStreamService2.isActive()) {
      return clickStreamService2.stopSession();
    }
    return screenCaptureService2.finishStudioWithoutRecording();
  });
  electron.ipcMain.handle(
    "capture:set-studio-capture-mode",
    (_event, mode) => screenCaptureService2.setStudioCaptureMode(mode)
  );
  electron.ipcMain.handle(
    "capture:set-studio-selection-rect",
    (_event, rect) => screenCaptureService2.setStudioSelectionRect(rect)
  );
  electron.ipcMain.handle(
    "capture:set-studio-cropper-visible",
    (_event, visible) => screenCaptureService2.setStudioCropperVisible(visible)
  );
  electron.ipcMain.handle("capture:update-studio-latest-step", async (_event, input) => {
    const payload = await screenCaptureService2.updateStudioLatestStep(input);
    const project = screenCaptureService2.getStudioCaptureInput()?.project;
    if (project) {
      clickStreamService2.syncProject(project);
    }
    return payload;
  });
  electron.ipcMain.handle("capture:delete-studio-latest-step", async () => {
    const payload = await screenCaptureService2.deleteStudioLatestStep();
    const project = screenCaptureService2.getStudioCaptureInput()?.project;
    if (project) {
      clickStreamService2.syncProject(project);
    }
    return payload;
  });
  electron.ipcMain.handle("capture:stop-click-stream", () => clickStreamService2.stopSession());
  captureService2.on("changed", (state) => {
    const webContents = getWebContents();
    if (webContents) {
      broadcast(webContents, state);
    }
  });
  clickStreamService2.on("step-created", (result) => {
    const webContents = getWebContents();
    if (webContents) {
      webContents.send("capture:auto-step-created", result);
    }
  });
  clickStreamService2.on("status", (status) => {
    broadcastToAll("capture:click-stream-status", status);
  });
  clickStreamService2.on("error", (error) => {
    broadcastToAll("capture:click-stream-error", String(error));
  });
  clickStreamService2.on("progress", (progress) => {
    broadcastToAll("capture:click-stream-progress", progress);
  });
  screenCaptureService2.on("click-stream-status", (status) => {
    broadcastToAll("capture:click-stream-status", status);
  });
  screenCaptureService2.on("click-stream-error", (error) => {
    broadcastToAll("capture:click-stream-error", String(error));
  });
  screenCaptureService2.on("studio-changed", (payload) => {
    broadcastToAll("capture:studio-changed", payload);
  });
}
function registerExportIpc(exportService2) {
  electron.ipcMain.handle(
    "exports:preview-html",
    (_event, input) => exportService2.previewHtml(input.project)
  );
  electron.ipcMain.handle(
    "exports:html",
    (_event, input) => exportService2.exportHtml(input.project)
  );
  electron.ipcMain.handle(
    "exports:open-path",
    (_event, absolutePath) => exportService2.openPath(absolutePath)
  );
}
function registerProjectIpc(projectService2, ocrService2) {
  electron.ipcMain.handle("projects:get-library", () => projectService2.getLibrary());
  electron.ipcMain.handle("projects:load", (_event, id) => projectService2.load(id));
  electron.ipcMain.handle(
    "projects:create-empty",
    (_event, input) => projectService2.createEmpty(input)
  );
  electron.ipcMain.handle(
    "projects:save",
    (_event, input) => projectService2.save(input)
  );
  electron.ipcMain.handle(
    "projects:update-meta",
    (_event, input) => projectService2.updateMeta(input)
  );
  electron.ipcMain.handle(
    "projects:duplicate",
    (_event, input) => projectService2.duplicate(input)
  );
  electron.ipcMain.handle(
    "projects:delete-many",
    (_event, input) => projectService2.deleteMany(input)
  );
  electron.ipcMain.handle(
    "projects:move-many",
    (_event, input) => projectService2.moveMany(input)
  );
  electron.ipcMain.handle(
    "projects:import-images",
    (_event, input) => projectService2.importImages(input)
  );
  electron.ipcMain.handle(
    "projects:import-annotation-asset",
    (_event, input) => projectService2.importAnnotationAsset(input)
  );
  electron.ipcMain.handle("projects:get-ocr-languages", () => ocrService2.getLanguages());
  electron.ipcMain.handle(
    "projects:recognize-step-text",
    (_event, input) => ocrService2.recognizeStep(input)
  );
  electron.ipcMain.handle(
    "projects:crop-step-asset",
    (_event, input) => projectService2.cropStepAsset(input)
  );
  electron.ipcMain.handle(
    "projects:create-folder",
    (_event, input) => projectService2.createFolder(input)
  );
  electron.ipcMain.handle(
    "projects:rename-folder",
    (_event, input) => projectService2.renameFolder(input)
  );
  electron.ipcMain.handle(
    "projects:delete-folder",
    (_event, input) => projectService2.deleteFolder(input)
  );
}
const DEFAULT_STATE = {
  status: "idle",
  mode: "guide",
  startedAt: null,
  lastStoppedAt: null
};
class CaptureService extends node_events.EventEmitter {
  state = { ...DEFAULT_STATE };
  getState() {
    return { ...this.state };
  }
  prepare(mode = "guide") {
    this.state = {
      ...this.state,
      status: "preparing",
      mode
    };
    this.emitChange();
    return this.getState();
  }
  start(mode = "guide") {
    this.state = {
      status: "recording",
      mode,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastStoppedAt: this.state.lastStoppedAt
    };
    this.emitChange();
    return this.getState();
  }
  pause() {
    this.state = {
      ...this.state,
      status: "paused"
    };
    this.emitChange();
    return this.getState();
  }
  stop() {
    this.state = {
      status: "stopped",
      mode: this.state.mode,
      startedAt: this.state.startedAt,
      lastStoppedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.emitChange();
    return this.getState();
  }
  reset() {
    this.state = { ...DEFAULT_STATE };
    this.emitChange();
    return this.getState();
  }
  emitChange() {
    this.emit("changed", this.getState());
  }
}
class ActiveWindowService {
  activeWinModule;
  constructor() {
    try {
      const require$1 = node_module.createRequire(require("url").pathToFileURL(__filename).href);
      const packageJsonPath = require$1.resolve("active-win/package.json");
      const binaryPath = path.join(path.dirname(packageJsonPath), "main");
      node_fs.chmodSync(binaryPath, 493);
      this.activeWinModule = require$1("active-win");
    } catch {
      this.activeWinModule = null;
    }
  }
  getSnapshot() {
    if (!this.activeWinModule) {
      return null;
    }
    try {
      const result = this.activeWinModule.sync();
      const width = result.bounds?.width ?? 0;
      const height = result.bounds?.height ?? 0;
      return {
        appName: result.owner?.name?.trim() || null,
        windowTitle: result.title?.trim() || null,
        bounds: width > 0 && height > 0 ? {
          x: result.bounds?.x ?? 0,
          y: result.bounds?.y ?? 0,
          width,
          height
        } : null
      };
    } catch {
      return null;
    }
  }
}
const DEFAULT_EDITOR_UI_PREFS = {
  appUiEditorLeftSidebarWidth: 248,
  appUiEditorRightSidebarWidth: 340,
  appUiEditorLeftSidebarOpened: true,
  appUiEditorRightSidebarOpened: true,
  appSettingFocusedViewForNewGuides: true,
  appUiStepsListGridView: true
};
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function normalizeEditorUiPrefs(input) {
  return {
    appUiEditorLeftSidebarWidth: clamp(
      Number(input?.appUiEditorLeftSidebarWidth ?? DEFAULT_EDITOR_UI_PREFS.appUiEditorLeftSidebarWidth),
      220,
      420
    ),
    appUiEditorRightSidebarWidth: clamp(
      Number(input?.appUiEditorRightSidebarWidth ?? DEFAULT_EDITOR_UI_PREFS.appUiEditorRightSidebarWidth),
      280,
      460
    ),
    appUiEditorLeftSidebarOpened: input?.appUiEditorLeftSidebarOpened ?? DEFAULT_EDITOR_UI_PREFS.appUiEditorLeftSidebarOpened,
    appUiEditorRightSidebarOpened: input?.appUiEditorRightSidebarOpened ?? DEFAULT_EDITOR_UI_PREFS.appUiEditorRightSidebarOpened,
    appSettingFocusedViewForNewGuides: input?.appSettingFocusedViewForNewGuides ?? DEFAULT_EDITOR_UI_PREFS.appSettingFocusedViewForNewGuides,
    appUiStepsListGridView: input?.appUiStepsListGridView ?? DEFAULT_EDITOR_UI_PREFS.appUiStepsListGridView
  };
}
class AppUiService {
  async getPrefsPath() {
    return path.join(electron.app.getPath("userData"), "ui-prefs.json");
  }
  async getEditorUiPrefs() {
    const filePath = await this.getPrefsPath();
    try {
      const raw = await promises.readFile(filePath, "utf8");
      return normalizeEditorUiPrefs(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_EDITOR_UI_PREFS };
    }
  }
  async patchEditorUiPrefs(patch) {
    const filePath = await this.getPrefsPath();
    const current = await this.getEditorUiPrefs();
    const next = normalizeEditorUiPrefs({
      ...current,
      ...patch
    });
    await promises.mkdir(path.dirname(filePath), { recursive: true });
    await promises.writeFile(filePath, JSON.stringify(next, null, 2), "utf8");
    return next;
  }
}
class ClickStreamService extends node_events.EventEmitter {
  constructor(hookService, captureService2, permissionsService2, screenCaptureService2, windowService2) {
    super();
    this.hookService = hookService;
    this.captureService = captureService2;
    this.permissionsService = permissionsService2;
    this.screenCaptureService = screenCaptureService2;
    this.windowService = windowService2;
    this.hookService.on("mouseclick", (event) => {
      void this.handleMouseClick(event);
    });
  }
  session = null;
  lastAcceptedClickAt = 0;
  captureInFlight = false;
  pendingClicks = [];
  lastAcceptedPoint = null;
  lastEmittedAt = null;
  suppressedUntil = 0;
  async startSession(input) {
    const permissions = await this.permissionsService.getSnapshot();
    if (permissions.accessibility !== "granted") {
      throw new Error(
        "Accessibility permission is required for click stream capture. Grant it in macOS Privacy & Security > Accessibility."
      );
    }
    if (!permissions.canCaptureScreens) {
      throw new Error(
        "Screen Recording permission is required for click stream capture."
      );
    }
    this.session = {
      project: input.project,
      title: input.title,
      notes: input.notes,
      armedAt: Date.now(),
      stopRequested: false,
      paused: false,
      acceptedCount: 0,
      completedCount: 0,
      sequence: 0
    };
    this.suppressedUntil = Date.now() + 450;
    this.lastAcceptedClickAt = 0;
    this.lastAcceptedPoint = null;
    this.captureInFlight = false;
    this.pendingClicks = [];
    this.lastEmittedAt = null;
    this.hookService.start();
    this.emit("status", "armed");
    this.emitProgress();
    return this.captureService.start("guide");
  }
  pauseSession() {
    if (!this.session) {
      return this.captureService.pause();
    }
    this.session.paused = true;
    this.suppressedUntil = Date.now() + 450;
    this.hookService.pause();
    this.emit("status", "paused");
    return this.captureService.pause();
  }
  resumeSession() {
    if (!this.session) {
      return this.captureService.start("guide");
    }
    this.session.paused = false;
    this.session.armedAt = Date.now();
    this.suppressedUntil = Date.now() + 450;
    this.hookService.start();
    this.emit("status", "armed");
    return this.captureService.start("guide");
  }
  stopSession() {
    if (!this.session) {
      this.captureInFlight = false;
      this.pendingClicks = [];
      this.hookService.pause();
      this.emit("status", "stopped");
      this.windowService.showMainWindow();
      return this.captureService.stop();
    }
    this.session.stopRequested = true;
    this.hookService.pause();
    if (this.captureInFlight || this.pendingClicks.length > 0) {
      this.emit("status", "draining");
      this.emitProgress();
      if (!this.captureInFlight) {
        void this.processQueue();
      }
      return this.captureService.getState();
    }
    return this.finalizeStop();
  }
  isActive() {
    return !!this.session;
  }
  syncProject(project) {
    if (!this.session) {
      return;
    }
    this.session.project = project;
  }
  async handleMouseClick(event) {
    if (!this.session) {
      return;
    }
    if (this.session.stopRequested) {
      this.emit("status", "draining");
      return;
    }
    if (this.session.paused) {
      this.emit("status", "paused");
      return;
    }
    if (Date.now() - this.session.armedAt < 250) {
      this.emit("status", "warming-up");
      return;
    }
    if (Date.now() < this.suppressedUntil) {
      this.emit("status", "warming-up");
      return;
    }
    if (this.isDuplicateClick(event)) {
      this.emit("status", "debounced");
      return;
    }
    if (this.isClickInsideMainWindow(event.x, event.y)) {
      this.emit("status", "ignored-main-window");
      return;
    }
    if (this.isClickInsideControlWindow(event.x, event.y)) {
      this.emit("status", "ignored-control-window");
      return;
    }
    if (!this.screenCaptureService.isPointInsideStudioDisplay(event.x, event.y)) {
      this.emit("status", "debounced");
      return;
    }
    this.lastAcceptedClickAt = Date.now();
    this.lastAcceptedPoint = {
      x: event.x,
      y: event.y,
      button: event.button
    };
    this.session.acceptedCount += 1;
    this.lastEmittedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.pendingClicks.push(event);
    this.emitProgress();
    if (this.captureInFlight) {
      this.emit("status", "queued");
      return;
    }
    await this.processQueue();
  }
  async processQueue() {
    if (!this.session || this.captureInFlight) {
      return;
    }
    this.captureInFlight = true;
    try {
      while (this.session && this.pendingClicks.length > 0) {
        const event = this.pendingClicks.shift();
        if (!event) {
          continue;
        }
        const session = this.session;
        this.emit("status", session.stopRequested ? "draining" : "capturing");
        try {
          const result = await this.screenCaptureService.captureStepFromClick(
            {
              project: session.project,
              title: session.title,
              notes: session.notes
            },
            event,
            ++session.sequence
          );
          if (!this.session) {
            continue;
          }
          session.project = result.project;
          session.completedCount += 1;
          this.emit("step-created", result);
          this.emitProgress();
        } catch (error) {
          this.emit("error", this.toErrorMessage(error));
        }
        if (this.pendingClicks.length > 0) {
          this.emit("status", this.session?.stopRequested ? "draining" : "queued");
        }
      }
    } finally {
      this.captureInFlight = false;
      if (!this.session) {
        this.emit("status", "stopped");
        return;
      }
      if (this.session.stopRequested) {
        if (this.pendingClicks.length > 0) {
          void this.processQueue();
          return;
        }
        this.finalizeStop();
        return;
      }
      if (this.session.paused) {
        this.emit("status", "paused");
        return;
      }
      this.emit("status", "armed");
    }
  }
  isDuplicateClick(event) {
    const withinTimeWindow = Date.now() - this.lastAcceptedClickAt < 120;
    if (!withinTimeWindow || !this.lastAcceptedPoint) {
      return false;
    }
    const sameButton = this.lastAcceptedPoint.button === event.button;
    const closeEnough = Math.abs(this.lastAcceptedPoint.x - event.x) <= 4 && Math.abs(this.lastAcceptedPoint.y - event.y) <= 4;
    return sameButton && closeEnough;
  }
  emitProgress() {
    const progress = {
      acceptedCount: this.session?.acceptedCount ?? 0,
      queuedCount: this.pendingClicks.length,
      completedCount: this.session?.completedCount ?? 0,
      lastEventAt: this.lastEmittedAt
    };
    this.emit("progress", progress);
  }
  isClickInsideMainWindow(x, y) {
    const mainWindow = this.windowService.getMainWindow();
    if (!mainWindow || !mainWindow.isVisible()) {
      return false;
    }
    const bounds = mainWindow.getBounds();
    if (!bounds) {
      return false;
    }
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
  }
  isClickInsideControlWindow(x, y) {
    const controlsWindow = this.windowService.getCaptureControlsWindow();
    if (!controlsWindow || !controlsWindow.isVisible()) {
      return false;
    }
    const bounds = controlsWindow.getBounds();
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
  }
  finalizeStop() {
    this.session = null;
    this.captureInFlight = false;
    this.pendingClicks = [];
    this.emit("status", "stopped");
    this.screenCaptureService.onClickStreamStopped();
    return this.captureService.stop();
  }
  toErrorMessage(error) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
const LEGACY_TEXTBLOCK_CSS = `/* Folge-inspired text blocks */
.stepTextBlock {
  display: flex;
  border-radius: 0.25em;
  border-bottom: 3px solid transparent;
  flex-direction: row;
  align-items: center;
  padding: 0.75em;
  margin: 1em 0em;
}
.stepTextBlock.error {
  border-color: #feb2b2;
  background-color: #fed7d7;
}
.stepTextBlock.info {
  border-color: #90cdf4;
  background-color: #bee3f8;
}
.stepTextBlock.success {
  border-color: #9ae6b4;
  background-color: #c6f6d5;
}
.stepTextBlock.warning {
  border-color: #faf089;
  background-color: #fefcbf;
}
.stepTextBlock.dark {
  border-color: #e5e7eb;
  background-color: #f9fafb;
}
.stepTextBlock .stepTextBlockIcon {
  width: 2.5em;
  height: 2.5em;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
  display: flex;
  border: 2px solid transparent;
  border-radius: 9999px;
}
.stepTextBlock .stepTextBlockIcon img {
  width: 1.5em;
  height: 1.5em;
}
.stepTextBlock.error .stepTextBlockIcon {
  border-color: #f56565;
  background-color: #fff5f5;
  color: #f56565;
}
.stepTextBlock.info .stepTextBlockIcon {
  border-color: #4299e1;
  background-color: #ebf8ff;
  color: #4299e1;
}
.stepTextBlock.success .stepTextBlockIcon {
  border-color: #48bb78;
  background-color: #f0fff4;
  color: #48bb78;
}
.stepTextBlock.warning .stepTextBlockIcon {
  border-color: #ecc94b;
  background-color: #fffff0;
  color: #ecc94b;
}
.stepTextBlock.dark .stepTextBlockIcon {
  border-color: #e5e7eb;
  color: #e5e7eb;
}
.stepTextBlock .stepTextBlockContent {
  margin-left: 1em;
}
.stepTextBlock .stepTextBlockTitle {
  font-size: 1.125em;
  font-weight: 600;
}
.stepTextBlock.error .stepTextBlockTitle {
  color: #9b2c2c;
}
.stepTextBlock.dark .stepTextBlockTitle {
  color: #212936;
}
.stepTextBlock.info .stepTextBlockTitle {
  color: #2c5282;
}
.stepTextBlock.success .stepTextBlockTitle {
  color: #276749;
}
.stepTextBlock.warning .stepTextBlockTitle {
  color: #975a16;
}
.stepTextBlock .stepTextBlockDescription {
  font-size: .875em;
}
.stepTextBlock.error .stepTextBlockDescription {
  color: #e53e3e;
}
.stepTextBlock.info .stepTextBlockDescription {
  color: #3182ce;
}
.stepTextBlock.success .stepTextBlockDescription {
  color: #38a169;
}
.stepTextBlock.warning .stepTextBlockDescription {
  color: #d69e2e;
}
.stepTextBlock.dark .stepTextBlockDescription {
  color: #1f2937;
}
.stepTextBlock .stepTextBlockDescription p {
  padding: 0;
  margin: 0;
}`;
const LINE_TYPES = /* @__PURE__ */ new Set(["line", "arrow", "brush"]);
const DEFAULT_COLOR = "#f2b91f";
const DEFAULT_TEXT_COLOR = "#ffffff";
const DEFAULT_BACKGROUND = "rgba(18,24,30,0.82)";
const DEFAULT_STROKE = 3;
const MIN_SIZE = 0.012;
const CLICK_CURSOR_PATH = `
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
const TEXT_CURSOR_PATH = `
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
const HAND_CURSOR_PATH = `
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
function escapeHtml$2(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function clampUnit(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
function clampMinUnit(value, min = MIN_SIZE) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(1, value));
}
function clampOpacity(value, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0.05, Math.min(1, value ?? fallback));
}
function clampInteger(value, fallback, min, max) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value ?? fallback)));
}
function normalizeLineStyle(value) {
  return value === "dashed" ? "dashed" : "solid";
}
function normalizeTextAlign(value) {
  if (value === "center" || value === "right") {
    return value;
  }
  return "left";
}
function normalizeCursorVariant(value) {
  if (value === "text" || value === "hand") {
    return value;
  }
  return "pointer";
}
function normalizeTooltipPlacement(value) {
  if (value === "top" || value === "left" || value === "right") {
    return value;
  }
  return "bottom";
}
function normalizeArea(x, y, width, height) {
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
function getDefaultArea(type) {
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
function normalizePoints(points) {
  const normalized = (points ?? []).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)).map((point) => ({ x: clampUnit(point.x), y: clampUnit(point.y) }));
  if (normalized.length >= 2) {
    return normalized;
  }
  return [
    { x: 0.2, y: 0.2 },
    { x: 0.3, y: 0.3 }
  ];
}
function getPointsBounds(points) {
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
function cropPoint(point, selection) {
  if (point.x < selection.x || point.x > selection.x + selection.width || point.y < selection.y || point.y > selection.y + selection.height) {
    return null;
  }
  return {
    x: clampUnit((point.x - selection.x) / selection.width),
    y: clampUnit((point.y - selection.y) / selection.height)
  };
}
function getArrowHeadPoints(x1, y1, x2, y2, length, spread = Math.PI / 7, fromStart = false) {
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
function getSvgTextAnchor(annotation) {
  if (annotation.textAlign === "center") {
    return "middle";
  }
  if (annotation.textAlign === "right") {
    return "end";
  }
  return "start";
}
function getSvgTextX(annotation, x, width) {
  if (annotation.textAlign === "center") {
    return x + width / 2;
  }
  if (annotation.textAlign === "right") {
    return x + width - 14;
  }
  return x + 14;
}
function getCursorPath(variant) {
  if (variant === "text") {
    return TEXT_CURSOR_PATH;
  }
  if (variant === "hand") {
    return HAND_CURSOR_PATH;
  }
  return CLICK_CURSOR_PATH;
}
function getCursorScale(variant, width, height) {
  if (variant === "text") {
    return Math.min(width / 42, height / 42);
  }
  return Math.min(width / 42, height / 50);
}
function renderCursorMarkup(annotation, x, y, width, height, shadowFilter = "url(#annotationCursorShadow)") {
  const variant = normalizeCursorVariant(annotation.cursorVariant);
  const scale = getCursorScale(variant, width, height);
  const path2 = getCursorPath(variant);
  const stroke = escapeHtml$2(annotation.color || "#111111");
  const fill = variant === "text" ? escapeHtml$2(annotation.color || "#ffffff") : "#ffffff";
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})" filter="${shadowFilter}">
      <path
        d="${path2}"
        fill="${fill}"
        stroke="${variant === "text" ? "rgba(18,24,30,0.72)" : stroke}"
        stroke-width="${variant === "text" ? 1.8 : 2.2}"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </g>
  `;
}
function renderMagnifyBlock(annotation, imageSourceUrl) {
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
  return `<div
    class="stepAnnotationMagnify"
    style="left:${bounds.x * 100}%;top:${bounds.y * 100}%;width:${bounds.width * 100}%;height:${bounds.height * 100}%;border-color:${escapeHtml$2(
    annotation.color || "#ffffff"
  )};opacity:${opacity};box-shadow:${shadow};"
  >
    <div
      class="stepAnnotationMagnifyLens"
      style="background-image:url('${escapeHtml$2(imageSourceUrl)}');background-size:${zoom * 100}% ${zoom * 100}%;background-position:${backgroundPositionX}% ${backgroundPositionY}%;"
    ></div>
  </div>`;
}
function renderAssetBlock(annotation, assetUrl) {
  if (!assetUrl) {
    return "";
  }
  const bounds = getAnnotationBounds(annotation);
  const opacity = clampOpacity(annotation.opacity, 1);
  const shadow = annotation.shadow === false ? "none" : "0 12px 26px rgba(18,24,32,0.18)";
  return `<div
    class="stepAnnotationAsset"
    style="left:${bounds.x * 100}%;top:${bounds.y * 100}%;width:${bounds.width * 100}%;height:${bounds.height * 100}%;border-radius:${annotation.radius ?? 14}px;opacity:${opacity};box-shadow:${shadow};"
  >
    <img class="stepAnnotationAssetImage" src="${escapeHtml$2(assetUrl)}" alt="" />
  </div>`;
}
function createAnnotationId() {
  return `annotation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function getAnnotationBounds(annotation) {
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
function normalizeStepAnnotation(annotation, index = 0) {
  const type = annotation.type;
  const base = {
    id: annotation.id || createAnnotationId(),
    type,
    x: clampUnit(annotation.x),
    y: clampUnit(annotation.y),
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
    showArrowHeadEnd: annotation.showArrowHeadEnd ?? type === "arrow",
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
  const defaultFill = type === "highlight" ? "rgba(247, 196, 34, 0.34)" : type === "tooltip" ? "rgba(18,24,30,0.84)" : type === "magnify" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)";
  return {
    ...base,
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    fillColor: annotation.fillColor ?? defaultFill,
    text: type === "text" ? annotation.text?.trim() || "Add text" : type === "tooltip" ? annotation.text?.trim() || "Explain this area" : annotation.text ?? null
  };
}
function normalizeStepAnnotations(annotations) {
  const normalized = (annotations ?? []).map((annotation, index) => normalizeStepAnnotation(annotation, index)).sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  let clickNumber = 0;
  return normalized.map((annotation, index) => ({
    ...annotation,
    order: index,
    number: annotation.type === "click" ? ++clickNumber : annotation.number ?? null
  }));
}
function renderClickMarkup(annotation, width, height) {
  const x = clampUnit(annotation.x) * width;
  const y = clampUnit(annotation.y) * height;
  const radius = Math.max(44, Math.round(Math.min(width, height) * 0.04));
  const ringRadius = Math.round(radius * 0.64);
  const cursorWidth = Math.max(56, Math.round(radius * 1.15));
  const cursorHeight = Math.round(cursorWidth * 1.26);
  const cursorLeft = Math.max(0, Math.min(width - cursorWidth, x - 20));
  const cursorTop = Math.max(0, Math.min(height - cursorHeight, y + 12));
  const badgeSize = Math.max(30, Math.min(42, Math.round((annotation.fontSize ?? 16) * 2)));
  const badgeRadius = Math.round(badgeSize / 2);
  const badgeX = Math.max(16, Math.min(width - badgeSize - 16, x + radius * 0.52));
  const badgeY = Math.max(16, Math.min(height - badgeSize - 16, y - radius * 0.92));
  return `
    <circle cx="${x}" cy="${y}" r="${radius}" fill="rgba(241, 200, 64, 0.42)" filter="url(#annotationGlow)" />
    <circle cx="${x}" cy="${y}" r="${ringRadius}" fill="rgba(241, 200, 64, 0.16)" stroke="rgba(241, 200, 64, 0.88)" stroke-width="2" />
    <rect x="${badgeX}" y="${badgeY}" rx="${badgeRadius}" ry="${badgeRadius}" width="${badgeSize}" height="${badgeSize}" fill="rgba(18,24,30,0.88)" stroke="rgba(255,255,255,0.92)" stroke-width="1.5" />
    <text x="${badgeX + badgeSize / 2}" y="${badgeY + badgeSize * 0.66}" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="${Math.max(
    15,
    Math.round((annotation.fontSize ?? 16) * 1.05)
  )}" font-weight="700" fill="#ffffff">${annotation.number ?? ""}</text>
    ${renderCursorMarkup(annotation, cursorLeft, cursorTop, cursorWidth, cursorHeight)}
  `;
}
function renderTextLikeAnnotation(annotation, width, height, tooltip = false) {
  const area = getAnnotationBounds(annotation);
  const x = area.x * width;
  const y = area.y * height;
  const annotationWidth = area.width * width;
  const annotationHeight = area.height * height;
  const radius = annotation.radius ?? (tooltip ? 16 : 10);
  const fill = escapeHtml$2(annotation.fillColor || annotation.backgroundColor || DEFAULT_BACKGROUND);
  const textColor = escapeHtml$2(annotation.textColor || DEFAULT_TEXT_COLOR);
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
      pointerMarkup = `<path d="M${x + 28} ${y + annotationHeight} L${x + 42} ${y + annotationHeight} L${x + 35} ${y + annotationHeight + pointerSize} Z" fill="${fill}" />`;
    } else if (placement === "top") {
      pointerMarkup = `<path d="M${x + 28} ${y} L${x + 42} ${y} L${x + 35} ${y - pointerSize} Z" fill="${fill}" />`;
    } else if (placement === "left") {
      pointerMarkup = `<path d="M${x} ${y + 22} L${x} ${y + 38} L${x - pointerSize} ${y + 30} Z" fill="${fill}" />`;
    } else {
      pointerMarkup = `<path d="M${x + annotationWidth} ${y + 22} L${x + annotationWidth} ${y + 38} L${x + annotationWidth + pointerSize} ${y + 30} Z" fill="${fill}" />`;
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
      >${escapeHtml$2(annotation.text || "")}</text>
    </g>
  `;
}
function renderSvgAnnotation(annotation, width, height) {
  const stroke = escapeHtml$2(annotation.color || DEFAULT_COLOR);
  const strokeWidth = Math.max(1, annotation.strokeWidth ?? DEFAULT_STROKE);
  const fill = escapeHtml$2(annotation.fillColor || "rgba(255,255,255,0.08)");
  if (annotation.type === "click") {
    return renderClickMarkup(annotation, width, height);
  }
  if (annotation.type === "cursor") {
    const area2 = getAnnotationBounds(annotation);
    return renderCursorMarkup(
      annotation,
      area2.x * width,
      area2.y * height,
      area2.width * width,
      area2.height * height
    );
  }
  if (annotation.type === "brush") {
    const points = normalizePoints(annotation.points).map((point) => `${point.x * width},${point.y * height}`).join(" ");
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
      ${annotation.showArrowHeadStart ? `<polygon points="${getArrowHeadPoints(x1, y1, x2, y2, headLength, Math.PI / 7, true)}" fill="${stroke}" />` : ""}
      ${annotation.showArrowHeadEnd ? `<polygon points="${getArrowHeadPoints(x1, y1, x2, y2, headLength)}" fill="${stroke}" />` : ""}
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
    return `
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
    `;
  }
  if (annotation.type === "text") {
    return renderTextLikeAnnotation(annotation, width, height);
  }
  if (annotation.type === "tooltip") {
    return renderTextLikeAnnotation(annotation, width, height, true);
  }
  if (annotation.type === "blur" || annotation.type === "magnify" || annotation.type === "asset") {
    return "";
  }
  if (annotation.type === "highlight") {
    return `
      <rect
        x="${x}"
        y="${y}"
        width="${annotationWidth}"
        height="${annotationHeight}"
        rx="${Math.min(radius, 14)}"
        ry="${Math.min(radius, 14)}"
        fill="${fill}"
        fill-opacity="${opacity}"
        stroke="${stroke}"
        stroke-width="${Math.max(1, strokeWidth - 1)}"
      />
    `;
  }
  return `
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
  `;
}
async function buildAnnotationOverlayMarkup(annotations, imageSize, imageSourceUrl, resolveAssetUrl) {
  const normalized = normalizeStepAnnotations(annotations);
  if (normalized.length === 0) {
    return "";
  }
  const blurBlocks = normalized.filter((annotation) => annotation.type === "blur").map((annotation) => {
    const bounds = getAnnotationBounds(annotation);
    return `<div
        class="stepAnnotationBlur"
        style="left:${bounds.x * 100}%;top:${bounds.y * 100}%;width:${bounds.width * 100}%;height:${bounds.height * 100}%;backdrop-filter:blur(${annotation.blurAmount ?? 12}px);"
      ></div>`;
  }).join("");
  const magnifyBlocks = normalized.filter((annotation) => annotation.type === "magnify").map((annotation) => renderMagnifyBlock(annotation, imageSourceUrl)).join("");
  const assetBlocks = (await Promise.all(
    normalized.filter((annotation) => annotation.type === "asset" && annotation.asset).map(async (annotation) => {
      const assetUrl = annotation.asset ? await resolveAssetUrl?.(annotation.asset) : null;
      return renderAssetBlock(annotation, assetUrl ?? annotation.asset?.appUrl ?? annotation.asset?.fileUrl ?? null);
    })
  )).join("");
  const svgMarkup = normalized.filter((annotation) => annotation.type !== "blur" && annotation.type !== "magnify" && annotation.type !== "asset").map((annotation) => renderSvgAnnotation(annotation, imageSize.width, imageSize.height)).join("");
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
function cropStepAnnotations(annotations, selection) {
  const normalized = normalizeStepAnnotations(annotations);
  return normalized.map((annotation) => {
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
      const croppedPoints = normalizePoints(annotation.points).map((point) => cropPoint(point, selection)).filter((point) => Boolean(point));
      if (croppedPoints.length < 2) {
        return null;
      }
      const bounds2 = getPointsBounds(croppedPoints);
      return {
        ...annotation,
        x: bounds2.x,
        y: bounds2.y,
        width: bounds2.width,
        height: bounds2.height,
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
  }).filter((annotation) => Boolean(annotation)).map((annotation, index) => ({
    ...annotation,
    order: index
  }));
}
function stripTags(value) {
  return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|blockquote|h1|h2|h3|h4|h5|h6)>/gi, "\n").replace(/<li>/gi, "• ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").trim();
}
function escapeHtml$1(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function htmlToPlainText(value) {
  return stripTags(value ?? "");
}
function plainTextToHtml(value) {
  const source = (value ?? "").trim();
  if (!source) {
    return "";
  }
  return source.split(/\n{2,}/).map((paragraph) => {
    const lines = paragraph.split("\n").map((line) => escapeHtml$1(line.trim())).join("<br />");
    return `<p>${lines}</p>`;
  }).join("");
}
function normalizeNotesHtml(html, fallbackText) {
  const normalizedHtml = (html ?? "").trim();
  if (normalizedHtml) {
    return normalizedHtml;
  }
  return plainTextToHtml(fallbackText);
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
async function assetToDataUrl(absolutePath) {
  const buffer = await promises.readFile(absolutePath);
  const extension = absolutePath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  return `data:image/${extension};base64,${buffer.toString("base64")}`;
}
function renderDescription(step) {
  return normalizeNotesHtml(step.notesHtml, step.notes);
}
async function renderStep(step, embedAssets) {
  const description = renderDescription(step);
  const imageSource = step.asset ? embedAssets ? await assetToDataUrl(step.asset.absolutePath) : step.asset.appUrl : null;
  const annotationMarkup = step.asset && step.kind === "action" ? await buildAnnotationOverlayMarkup(
    step.annotations,
    {
      width: step.asset.width,
      height: step.asset.height
    },
    imageSource,
    async (asset) => embedAssets ? assetToDataUrl(asset.absolutePath) : asset.appUrl
  ) : "";
  const imageMarkup = step.asset && step.kind === "action" ? `<p class="stepImageCover">
          <span class="stepImageStage">
            <img alt="${escapeHtml(step.title)}" class="img-responsive stepImage" src="${imageSource}" />
            ${annotationMarkup}
          </span>
        </p>` : "";
  if (step.kind === "section") {
    return `<div class="stepCard" id="step-${step.id}">
      <p class="stepTitle">
        <b>${escapeHtml(String(step.stepNumber ?? ""))}</b>
        <span class="stepTitleText">${escapeHtml(step.title)}</span>
      </p>
      <div class="stepDescription quillClasses">${description}</div>
    </div>`;
  }
  return `<div class="stepCard" id="step-${step.id}">
    <p class="stepTitle">
      <b>${escapeHtml(String(step.stepNumber ?? ""))}</b>
      <span class="stepTitleText">${escapeHtml(step.title)}</span>
    </p>
    ${description ? `<div class="stepDescription quillClasses">${description}</div><br />` : ""}
    ${imageMarkup}
  </div>`;
}
async function buildExportHtml(project) {
  const stepsHtml = await Promise.all(project.steps.map((step) => renderStep(step, true)));
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(project.name)}</title>
  <style>
    body {
      margin: 10px;
      font-family: "Avenir Next", "PingFang SC", sans-serif;
      background: #eff0f3;
      color: #0d0d0d;
    }
    p {
      margin: 0 0 0.6rem;
    }
    .guideShell {
      max-width: 1180px;
      margin: 0 auto;
      padding: 2rem 1rem 4rem;
    }
    .guideHero {
      background: linear-gradient(135deg, rgba(24, 28, 34, 0.98), rgba(58, 44, 34, 0.94));
      color: #f8f3ea;
      border-radius: 28px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.15);
      padding: 2rem;
      margin-bottom: 2rem;
    }
    .guideHeroKicker {
      display: inline-block;
      margin-bottom: 0.75rem;
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .guideHeroTitle {
      margin: 0 0 0.8rem;
      font-size: 2.7rem;
      line-height: 1;
    }
    .guideHeroDescription {
      max-width: 760px;
      color: rgba(248, 243, 234, 0.82);
      line-height: 1.7;
    }
    .guideHeroMeta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 1.3rem;
    }
    .guideHeroCard {
      padding: 1rem;
      border-radius: 18px;
      background: rgba(255,255,255,0.08);
    }
    .guideHeroCard span {
      display: block;
      color: rgba(248, 243, 234, 0.72);
      font-size: 0.82rem;
    }
    .guideHeroCard strong {
      display: block;
      margin-top: 0.5rem;
      font-size: 1.05rem;
    }
    .guideMain {
      background: transparent;
    }
    .stepCard {
      page-break-inside: avoid;
      page-break-after: auto;
      background: white;
      border-radius: 24px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.15);
      padding: 1.8rem 2rem;
      margin-bottom: 1.4rem;
    }
    .stepTitle {
      font-weight: 500;
      font-size: 1.2rem;
    }
    .stepTitle b {
      margin-right: 0.5rem;
    }
    .stepDescription {
      color: #38424d;
      line-height: 1.7;
    }
    .stepImageCover {
      text-align: center;
    }
    .stepImageStage {
      position: relative;
      display: inline-block;
      width: 100%;
    }
    .stepImage {
      display: block;
      max-width: 100%;
      border-radius: 16px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.15);
    }
    .stepAnnotationLayer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .stepAnnotationSvg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .stepAnnotationBlur {
      position: absolute;
      border: 3px solid #f2b91f;
      border-radius: 12px;
      background: rgba(16, 24, 32, 0.22);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.36);
    }
    .stepAnnotationMagnify {
      position: absolute;
      overflow: hidden;
      border: 4px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 12px 28px rgba(18, 24, 32, 0.22);
      background: rgba(255,255,255,0.18);
    }
    .stepAnnotationMagnifyLens {
      position: absolute;
      inset: 0;
      background-repeat: no-repeat;
      background-color: rgba(255,255,255,0.16);
    }
    .stepAnnotationAsset {
      position: absolute;
      overflow: hidden;
      box-shadow: 0 12px 26px rgba(18, 24, 32, 0.18);
      background: rgba(255,255,255,0.18);
    }
    .stepAnnotationAssetImage {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }
    .quillClasses p {
      margin: 0 0 0.75rem;
    }
    .quillClasses blockquote {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      border-left: 4px solid #d77a2a;
      background: #f9f3ea;
    }
    .quillClasses img {
      max-width: 100%;
    }
    ${LEGACY_TEXTBLOCK_CSS}
    @media (max-width: 900px) {
      .guideHeroMeta {
        grid-template-columns: 1fr;
      }
      .guideHeroTitle {
        font-size: 2rem;
      }
      .stepCard {
        padding: 1.2rem;
      }
    }
  </style>
</head>
<body>
  <div class="guideShell">
    <section class="guideHero">
      <span class="guideHeroKicker">${escapeHtml(project.cover.kicker)}</span>
      <h1 class="guideHeroTitle">${escapeHtml(project.name)}</h1>
      <div class="guideHeroDescription">${escapeHtml(project.cover.subtitle || project.description)}</div>
      <div class="guideHeroMeta">
        <div class="guideHeroCard">
          <span>Audience</span>
          <strong>${escapeHtml(project.cover.audience)}</strong>
        </div>
        <div class="guideHeroCard">
          <span>Outcome</span>
          <strong>${escapeHtml(project.cover.outcome)}</strong>
        </div>
        <div class="guideHeroCard">
          <span>Steps</span>
          <strong>${project.steps.length}</strong>
        </div>
      </div>
    </section>
    <main class="guideMain">
      ${stepsHtml.join("")}
    </main>
  </div>
</body>
</html>`;
}
async function buildPreviewHtml(project) {
  const stepsHtml = await Promise.all(project.steps.map((step) => renderStep(step, false)));
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body {
      margin: 0;
      font-family: "Avenir Next", "PingFang SC", sans-serif;
      background: #eff0f3;
      color: #0d0d0d;
    }
    .guideShell {
      max-width: 1080px;
      margin: 0 auto;
      padding: 1rem;
    }
    .guideHero {
      background: white;
      border-radius: 24px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.15);
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .guideHeroKicker {
      color: #9c5a23;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.76rem;
    }
    .guideHeroTitle {
      margin: 0.7rem 0;
      font-size: 2rem;
      line-height: 1.05;
    }
    .guideHeroDescription {
      color: #42515c;
      line-height: 1.7;
    }
    .stepCard {
      background: white;
      border-radius: 20px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.12);
      padding: 1.3rem 1.4rem;
      margin-bottom: 1rem;
    }
    .stepTitle {
      font-weight: 600;
      font-size: 1.05rem;
      margin-bottom: 0.8rem;
    }
    .stepTitle b {
      margin-right: 0.45rem;
    }
    .stepDescription {
      color: #42515c;
      line-height: 1.7;
    }
    .stepImageCover {
      text-align: center;
    }
    .stepImageStage {
      position: relative;
      display: inline-block;
      width: 100%;
    }
    .stepImage {
      display: block;
      max-width: 100%;
      border-radius: 14px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.12);
    }
    .stepAnnotationLayer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .stepAnnotationSvg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .stepAnnotationBlur {
      position: absolute;
      border: 3px solid #f2b91f;
      border-radius: 12px;
      background: rgba(16, 24, 32, 0.22);
      backdrop-filter: blur(11px);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.36);
    }
    .quillClasses p {
      margin: 0 0 0.75rem;
    }
    .quillClasses blockquote {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      border-left: 4px solid #d77a2a;
      background: #f9f3ea;
    }
    .quillClasses img {
      max-width: 100%;
    }
    ${LEGACY_TEXTBLOCK_CSS}
  </style>
</head>
<body>
  <div class="guideShell">
    <section class="guideHero">
      <div class="guideHeroKicker">${escapeHtml(project.cover.kicker)}</div>
      <h1 class="guideHeroTitle">${escapeHtml(project.name)}</h1>
      <div class="guideHeroDescription">${escapeHtml(project.cover.subtitle || project.description)}</div>
    </section>
    ${stepsHtml.join("")}
  </div>
</body>
</html>`;
}
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}
class ExportService {
  async previewHtml(project) {
    return buildPreviewHtml(project);
  }
  async exportHtml(project) {
    const suggestedName = `${slugify(project.name || "workflow") || "workflow"}.html`;
    const { canceled, filePath } = await electron.dialog.showSaveDialog({
      title: "Export workflow as HTML",
      defaultPath: path.basename(suggestedName),
      filters: [{ name: "HTML", extensions: ["html"] }]
    });
    if (canceled || !filePath) {
      throw new Error("HTML export was canceled.");
    }
    const html = await buildExportHtml(project);
    await promises.writeFile(filePath, html, "utf8");
    const fileInfo = await promises.stat(filePath);
    return {
      absolutePath: filePath,
      fileUrl: node_url.pathToFileURL(filePath).toString(),
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      fileSize: fileInfo.size,
      themeTone: project.theme.tone
    };
  }
  async openPath(absolutePath) {
    return electron.shell.openPath(absolutePath);
  }
}
class IOHookService extends node_events.EventEmitter {
  nativeModule;
  hookStarted = false;
  active = false;
  constructor() {
    super();
    const require$1 = node_module.createRequire(require("url").pathToFileURL(__filename).href);
    this.nativeModule = require$1("libuiohook-node");
  }
  start() {
    if (!this.hookStarted) {
      this.nativeModule.startHook((event) => this.handleNativeEvent(event));
      this.hookStarted = true;
    }
    this.active = true;
  }
  pause() {
    this.active = false;
  }
  stop() {
    this.pause();
    if (this.hookStarted) {
      this.nativeModule.stopHook();
      this.hookStarted = false;
    }
  }
  handleNativeEvent(event) {
    if (!this.active) {
      return;
    }
    const eventKind = event?.type === "mouseclick" || event?.type === 6 ? "mouseclick" : event?.type === "mousedown" || event?.type === 7 ? "mousedown" : null;
    if (!eventKind) {
      return;
    }
    const payload = event.mouse ?? event;
    if (typeof payload.x !== "number" || typeof payload.y !== "number") {
      return;
    }
    this.emit(eventKind, {
      kind: eventKind,
      button: payload.button ?? 0,
      clicks: payload.clicks ?? 1,
      x: payload.x,
      y: payload.y
    });
  }
}
const OCR_LANGUAGE_OPTIONS = [
  { code: "eng", label: "English" },
  { code: "chi_sim", label: "简体中文" },
  { code: "eng+chi_sim", label: "English + 简体中文" },
  { code: "deu", label: "Deutsch" },
  { code: "fra", label: "Français" },
  { code: "spa", label: "Español" },
  { code: "por", label: "Português" },
  { code: "jpn", label: "日本語" }
];
const OCR_MAX_DIMENSION = 2200;
const OCR_MIN_SELECTION_DIMENSION = 1200;
class OcrService {
  worker = null;
  tesseractModule = null;
  workerReady = false;
  currentLanguage = null;
  getLanguages() {
    return OCR_LANGUAGE_OPTIONS;
  }
  getWorkerScriptPath() {
    return electron.app.isPackaged ? path.join(electron.app.getAppPath(), "resources", "ocr", "tesseract-node-worker.cjs") : path.join(electron.app.getAppPath(), "resources", "ocr", "tesseract-node-worker.cjs");
  }
  async ensureWorkerDirectories() {
    const cachePath = path.join(electron.app.getPath("userData"), "ocr-cache");
    await promises.mkdir(cachePath, { recursive: true });
    return { cachePath };
  }
  async getTesseractModule() {
    if (this.tesseractModule) {
      return this.tesseractModule;
    }
    const loadedModule = await import("tesseract.js");
    this.tesseractModule = loadedModule.default ?? loadedModule;
    return this.tesseractModule;
  }
  async ensureWorker(language) {
    if (!this.worker) {
      const Tesseract = await this.getTesseractModule();
      const { cachePath } = await this.ensureWorkerDirectories();
      this.worker = Tesseract.createWorker({
        workerPath: this.getWorkerScriptPath(),
        cachePath,
        cacheMethod: "write",
        logger: () => void 0
      });
    }
    if (!this.workerReady) {
      await this.worker.load();
      this.workerReady = true;
    }
    if (this.currentLanguage !== language) {
      await this.worker.loadLanguage(language);
      await this.worker.initialize(language);
      await this.worker.setParameters({
        preserve_interword_spaces: "1"
      });
      this.currentLanguage = language;
    }
    return this.worker;
  }
  async recognizeStep(input) {
    const step = input.project.steps.find((candidate) => candidate.id === input.stepId);
    if (!step?.asset?.absolutePath) {
      return null;
    }
    const metadata = await sharp(step.asset.absolutePath).metadata();
    const imageWidth = metadata.width ?? step.asset.width;
    const imageHeight = metadata.height ?? step.asset.height;
    let pipeline = sharp(step.asset.absolutePath);
    let workingWidth = imageWidth;
    let workingHeight = imageHeight;
    if (input.selection && imageWidth > 0 && imageHeight > 0) {
      const left = Math.max(0, Math.min(imageWidth - 1, Math.floor(input.selection.x * imageWidth)));
      const top = Math.max(0, Math.min(imageHeight - 1, Math.floor(input.selection.y * imageHeight)));
      const width = Math.max(
        1,
        Math.min(imageWidth - left, Math.round(input.selection.width * imageWidth))
      );
      const height = Math.max(
        1,
        Math.min(imageHeight - top, Math.round(input.selection.height * imageHeight))
      );
      pipeline = pipeline.extract({ left, top, width, height });
      workingWidth = width;
      workingHeight = height;
    }
    const longestSide = Math.max(workingWidth, workingHeight);
    if (longestSide > OCR_MAX_DIMENSION) {
      pipeline = pipeline.resize({
        width: workingWidth >= workingHeight ? OCR_MAX_DIMENSION : void 0,
        height: workingHeight > workingWidth ? OCR_MAX_DIMENSION : void 0,
        fit: "inside",
        withoutEnlargement: true
      });
    } else if (input.selection && longestSide > 0 && longestSide < OCR_MIN_SELECTION_DIMENSION) {
      const scale = OCR_MIN_SELECTION_DIMENSION / longestSide;
      pipeline = pipeline.resize({
        width: Math.round(workingWidth * scale),
        height: Math.round(workingHeight * scale),
        fit: "fill"
      });
    }
    const recognitionSource = await pipeline.flatten({ background: "#ffffff" }).grayscale().normalize().sharpen().png().toBuffer();
    const worker = await this.ensureWorker(input.language);
    const result = await worker.recognize(recognitionSource);
    const text = result.data.text.trim();
    return {
      stepId: input.stepId,
      language: input.language,
      text,
      confidence: Number.isFinite(result.data.confidence) ? result.data.confidence : null,
      lines: result.data.lines.map((line) => line.text.trim()).filter(Boolean),
      selection: input.selection ?? null
    };
  }
  async terminate() {
    if (!this.worker) {
      return;
    }
    await this.worker.terminate();
    this.worker = null;
    this.workerReady = false;
    this.currentLanguage = null;
  }
}
class PermissionsService {
  async getSnapshot() {
    const notes = [];
    const accessibility = this.getAccessibilityStatus();
    let screenRecording = "unsupported";
    notes.push(
      `Runtime: ${electron.app.isPackaged ? "packaged" : "development"} · app name: ${electron.app.getName()} · exec: ${process.execPath}`
    );
    if (process.platform === "darwin") {
      try {
        const sources = await electron.desktopCapturer.getSources({
          types: ["screen"],
          thumbnailSize: { width: 32, height: 18 },
          fetchWindowIcons: false
        });
        const hasUsableThumbnail = sources.some((source) => !source.thumbnail.isEmpty());
        screenRecording = hasUsableThumbnail ? "granted" : "denied";
        notes.push(
          hasUsableThumbnail ? "Screen thumbnails are available to the app." : "Screen thumbnails are empty. macOS Screen Recording permission is likely missing."
        );
      } catch (error) {
        screenRecording = "denied";
        notes.push(`Screen capture probe failed: ${String(error)}`);
      }
    } else {
      screenRecording = "granted";
      notes.push("Non-macOS development path assumes screen capture is available.");
    }
    if (accessibility === "denied") {
      notes.push("Accessibility permission is not granted. Global input hooks will need this later.");
    }
    return {
      accessibility,
      screenRecording,
      canCaptureScreens: screenRecording === "granted",
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      notes
    };
  }
  getAccessibilityStatus() {
    if (process.platform !== "darwin") {
      return "unsupported";
    }
    return electron.systemPreferences.isTrustedAccessibilityClient(false) ? "granted" : "denied";
  }
}
function createId() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function defaultProjectName(date = /* @__PURE__ */ new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `Untitled - ${day}-${month}-${year}`;
}
function toAssetAppUrl(absolutePath) {
  return `easydo-asset://local/${encodeURIComponent(absolutePath)}`;
}
function defaultProjectCover(_name = defaultProjectName(), description = "") {
  return {
    kicker: "Workflow Playbook",
    subtitle: description || "Capture the exact sequence, edge cases, and visual checkpoints for a repeatable task.",
    audience: "Operations, support, and onboarding teams",
    outcome: "Ship a guide that a teammate can follow without shadowing you live."
  };
}
function defaultProjectTheme() {
  return {
    tone: "sunrise"
  };
}
function defaultGuideSettings() {
  return {
    showCoverPage: true,
    showStepNumbers: true,
    useFocusedViewByDefault: true,
    defaultExportFormat: "rich-html"
  };
}
function defaultPlaceholders() {
  return {
    productName: "Product",
    workspaceName: "Workspace",
    teamName: "Operations",
    ownerName: "Guide Owner"
  };
}
function defaultStepSettings(kind = "action") {
  return {
    forceNewPage: false,
    isContentBlock: kind === "content" || kind === "note",
    isMultiCaptureStep: false,
    includeSubstepTitles: true,
    showStepNumber: kind !== "content"
  };
}
function normalizeFolder(folder) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: folder.id,
    name: folder.name?.trim() || "New Folder",
    createdAt: folder.createdAt || now,
    updatedAt: folder.updatedAt || folder.createdAt || now
  };
}
function normalizeProject(project) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cover = {
    ...defaultProjectCover(project.name, project.description),
    ...project.cover ?? {}
  };
  const theme = {
    ...defaultProjectTheme(),
    ...project.theme ?? {}
  };
  const guideSettings = {
    ...defaultGuideSettings(),
    ...project.guideSettings ?? {}
  };
  const placeholders = {
    ...defaultPlaceholders(),
    ...project.placeholders ?? {}
  };
  return {
    ...project,
    createdAt: project.createdAt || project.updatedAt || now,
    updatedAt: project.updatedAt || project.createdAt || now,
    folderId: project.folderId ?? null,
    isFavorited: project.isFavorited ?? false,
    cover,
    theme,
    guideSettings,
    placeholders,
    steps: project.steps.map((step, index) => ({
      ...step,
      notesHtml: normalizeNotesHtml(step.notesHtml, step.notes),
      notes: htmlToPlainText(step.notesHtml ?? step.notes) || step.notes,
      status: step.status ?? "default",
      stepNumber: index + 1,
      clickIndex: step.clickIndex ?? null,
      appName: step.appName ?? null,
      windowTitle: step.windowTitle ?? null,
      contextLabel: step.contextLabel ?? null,
      textBlocks: (step.textBlocks ?? []).map((block) => ({
        ...block,
        contentHtml: normalizeNotesHtml(block.contentHtml, block.content),
        content: htmlToPlainText(block.contentHtml ?? block.content) || block.content,
        collapsed: block.collapsed ?? false
      })),
      settings: {
        ...defaultStepSettings(step.kind),
        ...step.settings ?? {}
      },
      annotations: normalizeStepAnnotations(step.annotations).map((annotation) => ({
        ...annotation,
        asset: annotation.asset ? {
          ...annotation.asset,
          appUrl: annotation.asset.appUrl || toAssetAppUrl(annotation.asset.absolutePath)
        } : annotation.asset
      })),
      asset: step.asset ? {
        ...step.asset,
        appUrl: step.asset.appUrl || toAssetAppUrl(step.asset.absolutePath)
      } : step.asset
    }))
  };
}
function normalizeProjectAssets(project) {
  return normalizeProject(project);
}
class ProjectService {
  async getDataDir() {
    const directory = path.join(electron.app.getPath("userData"), "easydo-data");
    await promises.mkdir(directory, { recursive: true });
    return directory;
  }
  async getProjectsDir() {
    const directory = path.join(await this.getDataDir(), "projects");
    await promises.mkdir(directory, { recursive: true });
    return directory;
  }
  async getFoldersFilePath() {
    return path.join(await this.getDataDir(), "folders.json");
  }
  async getProjectFilePath(id) {
    return path.join(await this.getProjectsDir(), `${id}.json`);
  }
  async getProjectAssetDir(projectId) {
    const directory = path.join(await this.getProjectsDir(), `${projectId}-assets`);
    await promises.mkdir(directory, { recursive: true });
    return directory;
  }
  async listFoldersInternal() {
    const filePath = await this.getFoldersFilePath();
    try {
      const raw = await promises.readFile(filePath, "utf8");
      return JSON.parse(raw).map((folder) => normalizeFolder(folder));
    } catch {
      return [];
    }
  }
  async saveFoldersInternal(folders) {
    const filePath = await this.getFoldersFilePath();
    const normalized = folders.map((folder) => normalizeFolder(folder));
    await promises.writeFile(filePath, JSON.stringify(normalized, null, 2) + "\n", "utf8");
  }
  async listProjectsInternal() {
    const directory = await this.getProjectsDir();
    const filenames = await promises.readdir(directory);
    const projects = await Promise.all(
      filenames.filter((filename) => filename.endsWith(".json")).map(async (filename) => {
        const filePath = path.join(directory, filename);
        const raw = await promises.readFile(filePath, "utf8");
        return normalizeProjectAssets(JSON.parse(raw));
      })
    );
    return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
  toProjectSummary(project, folders) {
    const folder = folders.find((item) => item.id === project.folderId) ?? null;
    const lastCapturedAt = project.steps.map((step) => step.capturedAt).filter((capturedAt) => Boolean(capturedAt)).sort().at(-1) ?? null;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      folderId: project.folderId,
      folderName: folder?.name ?? null,
      isFavorited: project.isFavorited,
      stepCount: project.steps.length,
      lastCapturedAt
    };
  }
  async getLibrary() {
    const [folders, projects] = await Promise.all([
      this.listFoldersInternal(),
      this.listProjectsInternal()
    ]);
    return {
      folders,
      guides: projects.map((project) => this.toProjectSummary(project, folders))
    };
  }
  async load(id) {
    const directory = await this.getProjectsDir();
    const filePath = path.join(directory, `${id}.json`);
    try {
      const raw = await promises.readFile(filePath, "utf8");
      return normalizeProjectAssets(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  async createEmpty(input) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return normalizeProject({
      id: createId(),
      name: input?.name?.trim() || defaultProjectName(new Date(now)),
      description: "Capture, describe, and refine a repeatable task.",
      createdAt: now,
      updatedAt: now,
      folderId: input?.folderId ?? null,
      isFavorited: false,
      cover: defaultProjectCover(),
      theme: defaultProjectTheme(),
      guideSettings: defaultGuideSettings(),
      placeholders: defaultPlaceholders(),
      steps: []
    });
  }
  async save(input) {
    const directory = await this.getProjectsDir();
    const project = normalizeProject({
      ...input.project,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const filePath = path.join(directory, `${project.id}.json`);
    await promises.writeFile(filePath, JSON.stringify(project, null, 2) + "\n", "utf8");
    return project;
  }
  async updateMeta(input) {
    const project = await this.load(input.id);
    if (!project) {
      return null;
    }
    return this.save({
      project: normalizeProject({
        ...project,
        ...input.patch
      })
    });
  }
  async duplicate(input) {
    const project = await this.load(input.id);
    if (!project) {
      return null;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const duplicated = normalizeProject({
      ...JSON.parse(JSON.stringify(project)),
      id: createId(),
      name: `${project.name} Copy`,
      createdAt: now,
      updatedAt: now
    });
    return this.save({ project: duplicated });
  }
  async deleteMany(input) {
    await Promise.all(
      input.ids.map(async (id) => {
        const filePath = await this.getProjectFilePath(id);
        await promises.rm(filePath, { force: true });
      })
    );
  }
  async moveMany(input) {
    const projects = await Promise.all(input.ids.map((id) => this.load(id)));
    await Promise.all(
      projects.filter((project) => Boolean(project)).map(
        (project) => this.save({
          project: {
            ...project,
            folderId: input.folderId
          }
        })
      )
    );
  }
  async importImages(input) {
    const selectedPaths = input.filePaths?.filter(Boolean) ?? (await electron.dialog.showOpenDialog({
      title: "Import images as guide steps",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"] }]
    })).filePaths;
    if (!selectedPaths.length) {
      return null;
    }
    const persistedProject = await this.save({
      project: input.project
    });
    const assetDirectory = await this.getProjectAssetDir(persistedProject.id);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const importedSteps = await Promise.all(
      selectedPaths.map(async (sourcePath, index) => {
        const assetId = createId();
        const extension = path.extname(sourcePath) || ".png";
        const assetFilename = `${assetId}${extension}`;
        const assetPath = path.join(assetDirectory, assetFilename);
        await promises.copyFile(sourcePath, assetPath);
        const metadata = await sharp(sourcePath).metadata().catch(() => null);
        const width = metadata?.width ?? 1440;
        const height = metadata?.height ?? 900;
        const stepNumber = persistedProject.steps.length + index + 1;
        const asset = {
          id: assetId,
          kind: "image",
          name: assetFilename,
          absolutePath: assetPath,
          fileUrl: node_url.pathToFileURL(assetPath).toString(),
          appUrl: toAssetAppUrl(assetPath),
          createdAt: now,
          width,
          height,
          displayLabel: path.basename(sourcePath)
        };
        return {
          id: createId(),
          stepNumber,
          clickIndex: null,
          title: `Step ${String(stepNumber).padStart(2, "0")}. Review ${path.basename(sourcePath, extension)}`,
          notes: `Imported from ${path.basename(sourcePath)}. Describe what the operator should do, verify, or learn from this screenshot.`,
          notesHtml: normalizeNotesHtml(
            null,
            `Imported from ${path.basename(sourcePath)}. Describe what the operator should do, verify, or learn from this screenshot.`
          ),
          kind: "action",
          status: "default",
          appName: null,
          windowTitle: null,
          contextLabel: "Imported image",
          annotations: [],
          textBlocks: [],
          settings: defaultStepSettings("action"),
          asset,
          capturedAt: now
        };
      })
    );
    const nextProject = normalizeProject({
      ...persistedProject,
      updatedAt: now,
      steps: [...persistedProject.steps, ...importedSteps]
    });
    const filePath = await this.getProjectFilePath(nextProject.id);
    await promises.writeFile(filePath, JSON.stringify(nextProject, null, 2) + "\n", "utf8");
    return {
      project: nextProject,
      importedSteps
    };
  }
  async importAnnotationAsset(input) {
    const persistedProject = await this.save({
      project: input.project
    });
    const stepIndex = persistedProject.steps.findIndex((step2) => step2.id === input.stepId);
    const step = persistedProject.steps[stepIndex];
    if (!step) {
      return null;
    }
    const selectedPaths = (await electron.dialog.showOpenDialog({
      title: "Add image asset to annotation",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"] }]
    })).filePaths;
    const sourcePath = selectedPaths[0];
    if (!sourcePath) {
      return null;
    }
    const assetId = createId();
    const extension = path.extname(sourcePath) || ".png";
    const assetFilename = `${assetId}${extension}`;
    const assetDirectory = await this.getProjectAssetDir(persistedProject.id);
    const assetPath = path.join(assetDirectory, assetFilename);
    await promises.copyFile(sourcePath, assetPath);
    const metadata = await sharp(sourcePath).metadata().catch(() => null);
    const width = metadata?.width ?? 640;
    const height = metadata?.height ?? 480;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const asset = {
      id: assetId,
      kind: "image",
      name: assetFilename,
      absolutePath: assetPath,
      fileUrl: node_url.pathToFileURL(assetPath).toString(),
      appUrl: toAssetAppUrl(assetPath),
      createdAt: now,
      width,
      height,
      displayLabel: path.basename(sourcePath)
    };
    const annotation = {
      id: createAnnotationId(),
      type: "asset",
      x: 0.12,
      y: 0.12,
      width: 0.2,
      height: Math.max(0.1, Math.min(0.3, 0.2 * (height / Math.max(1, width)))),
      color: "#ffffff",
      fillColor: "rgba(255,255,255,0.08)",
      strokeWidth: 0,
      radius: 14,
      shadow: true,
      asset,
      order: step.annotations?.length ?? 0
    };
    const nextSteps = [...persistedProject.steps];
    nextSteps[stepIndex] = {
      ...step,
      annotations: [...step.annotations ?? [], annotation]
    };
    const nextProject = await this.save({
      project: {
        ...persistedProject,
        steps: nextSteps,
        updatedAt: now
      }
    });
    return {
      project: nextProject,
      annotation,
      asset
    };
  }
  async cropStepAsset(input) {
    const persistedProject = await this.save({
      project: input.project
    });
    const stepIndex = persistedProject.steps.findIndex((step2) => step2.id === input.stepId);
    const step = persistedProject.steps[stepIndex];
    if (!step?.asset) {
      return null;
    }
    const image = sharp(step.asset.absolutePath);
    const metadata = await image.metadata();
    const width = metadata.width ?? step.asset.width;
    const height = metadata.height ?? step.asset.height;
    const left = Math.max(0, Math.min(width - 1, Math.round(input.selection.x * width)));
    const top = Math.max(0, Math.min(height - 1, Math.round(input.selection.y * height)));
    const cropWidth = Math.max(1, Math.min(width - left, Math.round(input.selection.width * width)));
    const cropHeight = Math.max(1, Math.min(height - top, Math.round(input.selection.height * height)));
    const croppedBuffer = await image.extract({ left, top, width: cropWidth, height: cropHeight }).png().toBuffer();
    const assetId = createId();
    const assetFilename = `${assetId}.png`;
    const assetDirectory = await this.getProjectAssetDir(persistedProject.id);
    const assetPath = path.join(assetDirectory, assetFilename);
    await promises.writeFile(assetPath, croppedBuffer);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const asset = {
      id: assetId,
      kind: "image",
      name: assetFilename,
      absolutePath: assetPath,
      fileUrl: node_url.pathToFileURL(assetPath).toString(),
      appUrl: toAssetAppUrl(assetPath),
      createdAt: now,
      width: cropWidth,
      height: cropHeight,
      displayLabel: `${step.asset.displayLabel} (cropped)`
    };
    const nextStep = {
      ...step,
      asset,
      annotations: cropStepAnnotations(step.annotations, input.selection),
      capturedAt: now
    };
    const nextSteps = [...persistedProject.steps];
    nextSteps[stepIndex] = nextStep;
    const nextProject = await this.save({
      project: {
        ...persistedProject,
        steps: nextSteps,
        updatedAt: now
      }
    });
    return {
      project: nextProject,
      step: nextProject.steps[stepIndex],
      asset
    };
  }
  async createFolder(input) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const folder = normalizeFolder({
      id: createId(),
      name: input.name,
      createdAt: now,
      updatedAt: now
    });
    const folders = await this.listFoldersInternal();
    folders.push(folder);
    await this.saveFoldersInternal(folders);
    return folder;
  }
  async renameFolder(input) {
    const folders = await this.listFoldersInternal();
    const target = folders.find((folder) => folder.id === input.id);
    if (!target) {
      return null;
    }
    target.name = input.name.trim() || target.name;
    target.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.saveFoldersInternal(folders);
    return target;
  }
  async deleteFolder(input) {
    const folders = await this.listFoldersInternal();
    await this.saveFoldersInternal(folders.filter((folder) => folder.id !== input.id));
    const projects = await this.listProjectsInternal();
    await Promise.all(
      projects.filter((project) => project.folderId === input.id).map(
        (project) => this.save({
          project: {
            ...project,
            folderId: null
          }
        })
      )
    );
  }
  async addCapturedStep(input) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const persistedProject = await this.save({
      project: input.project
    });
    const assetId = createId();
    const assetFilename = `${assetId}.png`;
    const assetDirectory = await this.getProjectAssetDir(persistedProject.id);
    const assetPath = path.join(assetDirectory, assetFilename);
    await promises.writeFile(assetPath, input.screenshot);
    const asset = {
      id: assetId,
      kind: "image",
      name: assetFilename,
      absolutePath: assetPath,
      fileUrl: node_url.pathToFileURL(assetPath).toString(),
      appUrl: toAssetAppUrl(assetPath),
      createdAt: now,
      width: input.width,
      height: input.height,
      displayLabel: input.displayLabel
    };
    const capturedStep = {
      id: createId(),
      stepNumber: persistedProject.steps.length + 1,
      clickIndex: input.clickIndex ?? null,
      title: input.title?.trim() || `Captured step ${persistedProject.steps.length + 1}`,
      notes: input.notes?.trim() || `Screenshot captured from ${input.displayLabel}. Add operator guidance, expected outcome, and edge cases here.`,
      notesHtml: normalizeNotesHtml(
        null,
        input.notes?.trim() || `Screenshot captured from ${input.displayLabel}. Add operator guidance, expected outcome, and edge cases here.`
      ),
      kind: "action",
      status: "default",
      appName: input.appName ?? null,
      windowTitle: input.windowTitle ?? null,
      contextLabel: input.contextLabel ?? null,
      annotations: [],
      asset,
      capturedAt: now
    };
    const nextProject = normalizeProject({
      ...persistedProject,
      updatedAt: now,
      steps: [...persistedProject.steps, capturedStep]
    });
    const filePath = await this.getProjectFilePath(nextProject.id);
    await promises.writeFile(filePath, JSON.stringify(nextProject, null, 2) + "\n", "utf8");
    return {
      project: nextProject,
      capturedStep,
      asset
    };
  }
}
const GENERIC_TITLE_TOKENS = /* @__PURE__ */ new Set([
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
function padStepNumber(value) {
  return String(value).padStart(2, "0");
}
function cleanToken(token) {
  return token.replace(/\s+/g, " ").trim();
}
function normalizeWindowTitle(rawWindowTitle, appName) {
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
function resolveInteractionContainer(screenX, screenY, displayBounds, displayLabel, activeWindow) {
  const windowBounds = activeWindow?.bounds;
  if (windowBounds && screenX >= windowBounds.x && screenX <= windowBounds.x + windowBounds.width && screenY >= windowBounds.y && screenY <= windowBounds.y + windowBounds.height && windowBounds.width > 0 && windowBounds.height > 0) {
    return {
      kind: "window",
      label: normalizeWindowTitle(activeWindow?.windowTitle, activeWindow?.appName) || activeWindow?.appName || displayLabel,
      bounds: windowBounds
    };
  }
  return {
    kind: "display",
    label: displayLabel,
    bounds: displayBounds
  };
}
function inferInteractionRegion(screenX, screenY, container, button, clicks) {
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
function chooseContextLabel(input) {
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
  const parts = compact.split(/\s[|·—]\s|\s-\s/).map((part) => cleanToken(part)).filter(Boolean);
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
function buildStepNarrative(input) {
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
  const whereText = input.container.kind === "window" ? `the ${region.label} of ${input.container.label}` : `the ${region.label} on ${input.displayLabel}`;
  const windowText = appName && windowTitle && windowTitle !== appName ? `Recorded in ${appName}, window "${windowTitle}".` : appName ? `Recorded in ${appName}.` : `Recorded on ${input.displayLabel}.`;
  return {
    title: `Step ${padStepNumber(input.stepNumber)}. ${region.titleVerb}${titleSuffix}`,
    notes: `${clickPrefix} was captured in ${whereText}. ${windowText} Use this step to replace the placeholder control name with the exact label the operator should click, then verify that ${region.expectedOutcome}.`,
    contextLabel,
    appName,
    windowTitle,
    areaLabel: region.label
  };
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function toPlainResult(result) {
  if (!result) {
    return null;
  }
  return JSON.parse(JSON.stringify(result));
}
function clampRectToBounds(rect, bounds) {
  const x = Math.max(0, Math.min(rect.x, bounds.width));
  const y = Math.max(0, Math.min(rect.y, bounds.height));
  const width = Math.max(0, Math.min(rect.width, bounds.width - x));
  const height = Math.max(0, Math.min(rect.height, bounds.height - y));
  return {
    x,
    y,
    width,
    height
  };
}
class ScreenCaptureService extends node_events.EventEmitter {
  constructor(captureService2, permissionsService2, activeWindowService2, projectService2, windowService2) {
    super();
    this.captureService = captureService2;
    this.permissionsService = permissionsService2;
    this.activeWindowService = activeWindowService2;
    this.projectService = projectService2;
    this.windowService = windowService2;
  }
  overlayPayload = null;
  pendingAreaSelection = null;
  pendingClickStreamHandoff = null;
  clickCaptureStudio = null;
  async captureStep(input) {
    const { image, display, permissions, currentState } = await this.capturePrimaryDisplay();
    const stepNumber = input.project.steps.length + 1;
    const annotatedScreenshot = await this.annotateCaptureOnImage(image.toPNG(), image.getSize(), {
      stepNumber
    });
    const result = await this.projectService.addCapturedStep({
      project: input.project,
      screenshot: annotatedScreenshot,
      title: input.title?.trim() || `Step ${String(stepNumber).padStart(2, "0")}. Capture the current screen state`,
      notes: input.notes?.trim() || `Review the visible screen for step ${String(stepNumber).padStart(2, "0")}, then describe the exact UI state the operator should confirm before moving on.`,
      width: image.getSize().width,
      height: image.getSize().height,
      displayLabel: display.label
    });
    return {
      project: result.project,
      capturedStep: result.capturedStep,
      asset: result.asset,
      captureState: currentState,
      permissions
    };
  }
  async captureStepFromClick(input, clickEvent, sequence) {
    const studio = this.clickCaptureStudio;
    const shouldHideStudioChrome = studio?.phase === "recording";
    if (shouldHideStudioChrome) {
      this.windowService.hideCaptureChrome();
      await delay(110);
    }
    try {
      const activeWindow = this.activeWindowService.getSnapshot();
      const { image, display, permissions, currentState } = await this.captureDisplayAtPoint(
        clickEvent.x,
        clickEvent.y,
        1800
      );
      let workingImage = image;
      let displayBoundsForAnnotation = {
        width: display.bounds.width,
        height: display.bounds.height
      };
      let clickPointInCapture = {
        x: clickEvent.x - display.bounds.x,
        y: clickEvent.y - display.bounds.y
      };
      if (studio?.captureMode === "selected-region") {
        const region = this.getStudioSelectionForDisplay(display.bounds);
        if (region) {
          const cropRect = this.normalizeRect(region, displayBoundsForAnnotation, image.getSize());
          workingImage = image.crop(cropRect);
          displayBoundsForAnnotation = {
            width: region.width,
            height: region.height
          };
          clickPointInCapture = {
            x: clickPointInCapture.x - region.x,
            y: clickPointInCapture.y - region.y
          };
        }
      }
      if (studio?.captureMode === "active-window") {
        const target = this.resolveActiveWindowTarget(display, activeWindow);
        if (target) {
          const cropRect = this.normalizeRect(
            target.bounds,
            {
              width: display.bounds.width,
              height: display.bounds.height
            },
            image.getSize()
          );
          workingImage = image.crop(cropRect);
          displayBoundsForAnnotation = {
            width: target.bounds.width,
            height: target.bounds.height
          };
          clickPointInCapture = {
            x: clickPointInCapture.x - target.bounds.x,
            y: clickPointInCapture.y - target.bounds.y
          };
          this.updateStudioActiveWindowState(target.bounds, target.label);
        }
      }
      const trigger = this.buildClickCaptureEvent(clickEvent, display, sequence);
      const interactionContainer = resolveInteractionContainer(
        clickEvent.x,
        clickEvent.y,
        display.bounds,
        display.label,
        activeWindow
      );
      const stepNumber = input.project.steps.length + 1;
      const narrative = buildStepNarrative({
        stepNumber,
        clickIndex: sequence,
        button: trigger.button,
        clicks: trigger.clicks,
        screenX: trigger.screenX,
        screenY: trigger.screenY,
        displayLabel: trigger.displayLabel,
        activeWindow,
        container: interactionContainer
      });
      const annotatedScreenshot = await this.annotateCaptureOnImage(
        workingImage.toPNG(),
        workingImage.getSize(),
        {
          stepNumber,
          clickIndex: sequence,
          clickPoint: clickPointInCapture,
          displayBounds: displayBoundsForAnnotation
        }
      );
      const result = await this.projectService.addCapturedStep({
        project: input.project,
        screenshot: annotatedScreenshot,
        title: input.title?.trim() || narrative.title,
        notes: input.notes?.trim() || narrative.notes,
        width: workingImage.getSize().width,
        height: workingImage.getSize().height,
        displayLabel: display.label,
        clickIndex: sequence,
        appName: narrative.appName,
        windowTitle: narrative.windowTitle,
        contextLabel: narrative.contextLabel
      });
      this.recordStudioStep({
        project: result.project,
        capturedStep: result.capturedStep,
        asset: result.asset,
        captureState: currentState,
        permissions,
        trigger
      });
      return {
        project: result.project,
        capturedStep: result.capturedStep,
        asset: result.asset,
        captureState: currentState,
        permissions,
        trigger
      };
    } finally {
      if (shouldHideStudioChrome && this.clickCaptureStudio?.phase === "recording") {
        await delay(60);
        this.windowService.showCaptureChrome();
        this.windowService.setCaptureOverlayInteractive(false);
      }
    }
  }
  async beginAreaSelection(input) {
    if (this.pendingAreaSelection || this.pendingClickStreamHandoff || this.clickCaptureStudio) {
      throw new Error("A capture selection is already in progress.");
    }
    this.windowService.hideMainWindow();
    await delay(150);
    try {
      const { image, display } = await this.capturePrimaryDisplay();
      this.overlayPayload = {
        mode: "area-selection",
        imageDataUrl: image.toDataURL(),
        displayLabel: display.label,
        displayBounds: {
          width: display.bounds.width,
          height: display.bounds.height
        },
        imageSize: image.getSize(),
        suggestedTitle: input.title?.trim() || "Selected capture region",
        suggestedNotes: input.notes?.trim() || "Describe what should happen inside this selected region."
      };
      this.windowService.createCaptureOverlayWindow(display.bounds);
      return await new Promise((resolve, reject) => {
        this.pendingAreaSelection = {
          input,
          image,
          displayLabel: display.label,
          displayBounds: display.bounds,
          resolve,
          reject
        };
      });
    } catch (error) {
      this.windowService.showMainWindow();
      throw error;
    }
  }
  async beginClickStreamHandoff(input) {
    if (this.pendingAreaSelection || this.pendingClickStreamHandoff || this.clickCaptureStudio) {
      throw new Error("Another capture overlay is already in progress.");
    }
    const permissions = await this.permissionsService.getSnapshot();
    if (!permissions.canCaptureScreens) {
      throw new Error("Screen Recording permission is required for click stream capture.");
    }
    const currentDisplay = electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint());
    const display = {
      id: String(currentDisplay.id),
      bounds: currentDisplay.bounds,
      label: currentDisplay.label || currentDisplay.id?.toString() || "Display"
    };
    this.windowService.hideMainWindow();
    await delay(150);
    this.pendingClickStreamHandoff = {
      input,
      display
    };
    this.overlayPayload = {
      mode: "click-stream-handoff",
      displayLabel: display.label,
      displayBounds: {
        width: display.bounds.width,
        height: display.bounds.height
      },
      headline: "Click here to continue with capturing on this screen",
      description: "easyDo will hide while recording your clicks so the target app stays visible. Press Esc to cancel and return to guide setup.",
      confirmLabel: "Continue Capture"
    };
    this.windowService.createCaptureOverlayWindow(display.bounds);
    this.emitClickStreamStatus("handoff");
    return this.captureService.prepare("guide");
  }
  getOverlayPayload() {
    return this.overlayPayload;
  }
  getStudioPayload() {
    if (!this.clickCaptureStudio) {
      return null;
    }
    return {
      phase: this.clickCaptureStudio.phase,
      displayLabel: this.clickCaptureStudio.display.label,
      displayBounds: {
        width: this.clickCaptureStudio.display.bounds.width,
        height: this.clickCaptureStudio.display.bounds.height
      },
      captureMode: this.clickCaptureStudio.captureMode,
      selectedRegion: { ...this.clickCaptureStudio.selectedRegion },
      activeWindowBounds: this.clickCaptureStudio.activeWindowBounds ? { ...this.clickCaptureStudio.activeWindowBounds } : null,
      activeWindowLabel: this.clickCaptureStudio.activeWindowLabel,
      cropperVisible: this.clickCaptureStudio.cropperVisible,
      stepCount: this.clickCaptureStudio.input.project.steps.length,
      latestStep: this.clickCaptureStudio.latestStep ? { ...this.clickCaptureStudio.latestStep } : null
    };
  }
  async continueOverlayClickStream() {
    const pending = this.pendingClickStreamHandoff;
    if (!pending) {
      throw new Error("No click stream handoff is currently waiting.");
    }
    this.pendingClickStreamHandoff = null;
    this.windowService.closeCaptureOverlayWindow();
    await delay(90);
    const backdrop = await this.captureDisplayPreview(pending.display);
    this.clickCaptureStudio = {
      input: pending.input,
      phase: "setup",
      captureMode: "selected-region",
      display: pending.display,
      backdropImageDataUrl: backdrop.image.toDataURL(),
      backdropImageSize: backdrop.image.getSize(),
      cropperVisible: true,
      selectedRegion: this.createDefaultStudioSelection(pending.display.bounds),
      activeWindowBounds: null,
      activeWindowLabel: null,
      latestStep: null
    };
    this.overlayPayload = this.createStudioOverlayPayload();
    this.windowService.createCaptureOverlayWindow(pending.display.bounds);
    this.windowService.closeCaptureControlsWindow();
    this.syncStudioChrome();
    this.emitStudioChanged();
    this.emitClickStreamStatus("setup");
  }
  prepareStudioForRecording() {
    if (!this.clickCaptureStudio) {
      throw new Error("No click capture studio session is active.");
    }
    this.clickCaptureStudio.phase = "recording";
    this.overlayPayload = this.createStudioOverlayPayload();
    this.ensureCaptureControlsWindow();
    this.syncStudioChrome();
    this.emitStudioChanged();
  }
  pauseStudioSession() {
    if (!this.clickCaptureStudio) {
      return;
    }
    this.clickCaptureStudio.phase = "paused";
    this.overlayPayload = this.createStudioOverlayPayload();
    this.windowService.closeCaptureControlsWindow();
    this.syncStudioChrome();
    this.emitStudioChanged();
    this.emitClickStreamStatus("paused");
    void this.refreshStudioBackdrop();
  }
  resumeStudioSession() {
    if (!this.clickCaptureStudio) {
      return;
    }
    this.clickCaptureStudio.phase = "recording";
    this.overlayPayload = this.createStudioOverlayPayload();
    this.ensureCaptureControlsWindow();
    this.syncStudioChrome();
    this.emitStudioChanged();
  }
  completeStudioSession(showMainWindow = true) {
    this.pendingClickStreamHandoff = null;
    this.clickCaptureStudio = null;
    this.overlayPayload = null;
    this.windowService.closeCaptureWindows();
    if (showMainWindow) {
      this.windowService.showMainWindow();
    }
    this.emitStudioChanged();
  }
  async finishStudioWithoutRecording() {
    this.completeStudioSession(true);
    this.emitClickStreamStatus("stopped");
    return this.captureService.reset();
  }
  async setStudioCaptureMode(mode) {
    if (!this.clickCaptureStudio) {
      return null;
    }
    this.clickCaptureStudio.captureMode = mode;
    if (mode === "active-window") {
      await this.refreshStudioActiveWindowTarget();
    }
    if (mode === "full-screen") {
      this.clickCaptureStudio.activeWindowBounds = null;
      this.clickCaptureStudio.activeWindowLabel = null;
    }
    this.overlayPayload = this.createStudioOverlayPayload();
    this.syncStudioChrome();
    this.emitStudioChanged();
    return this.getStudioPayload();
  }
  async setStudioSelectionRect(rect) {
    if (!this.clickCaptureStudio) {
      return null;
    }
    this.clickCaptureStudio.selectedRegion = clampRectToBounds(rect, {
      width: this.clickCaptureStudio.display.bounds.width,
      height: this.clickCaptureStudio.display.bounds.height
    });
    this.overlayPayload = this.createStudioOverlayPayload();
    this.syncStudioChrome();
    this.emitStudioChanged();
    return this.getStudioPayload();
  }
  async setStudioCropperVisible(visible) {
    if (!this.clickCaptureStudio) {
      return null;
    }
    this.clickCaptureStudio.cropperVisible = visible;
    this.overlayPayload = this.createStudioOverlayPayload();
    this.syncStudioChrome();
    this.emitStudioChanged();
    return this.getStudioPayload();
  }
  async updateStudioLatestStep(input) {
    if (!this.clickCaptureStudio?.latestStep) {
      return null;
    }
    const latestStepId = this.clickCaptureStudio.latestStep.stepId;
    const project = this.clickCaptureStudio.input.project;
    const nextProject = {
      ...project,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      steps: project.steps.map(
        (step) => step.id === latestStepId ? {
          ...step,
          title: input.title !== void 0 ? input.title : step.title,
          notes: input.notes !== void 0 ? input.notes : step.notes
        } : step
      )
    };
    const persistedProject = await this.projectService.save({
      project: nextProject
    });
    this.clickCaptureStudio.input = {
      ...this.clickCaptureStudio.input,
      project: persistedProject
    };
    const latestStep = persistedProject.steps.find((step) => step.id === latestStepId) ?? null;
    this.clickCaptureStudio.latestStep = latestStep ? this.buildStudioLatestStep(latestStep) : null;
    this.emitStudioChanged();
    return this.getStudioPayload();
  }
  async deleteStudioLatestStep() {
    if (!this.clickCaptureStudio?.latestStep) {
      return null;
    }
    const latestStepId = this.clickCaptureStudio.latestStep.stepId;
    const project = this.clickCaptureStudio.input.project;
    const nextProject = {
      ...project,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      steps: project.steps.filter((step) => step.id !== latestStepId)
    };
    const persistedProject = await this.projectService.save({
      project: nextProject
    });
    this.clickCaptureStudio.input = {
      ...this.clickCaptureStudio.input,
      project: persistedProject
    };
    const latestStep = persistedProject.steps.at(-1) ?? null;
    this.clickCaptureStudio.latestStep = latestStep ? this.buildStudioLatestStep(latestStep) : null;
    this.emitStudioChanged();
    return this.getStudioPayload();
  }
  getStudioCaptureInput() {
    if (!this.clickCaptureStudio) {
      return null;
    }
    return {
      project: this.clickCaptureStudio.input.project,
      title: this.clickCaptureStudio.input.title,
      notes: this.clickCaptureStudio.input.notes
    };
  }
  isPointInsideStudioDisplay(x, y) {
    const studioBounds = this.clickCaptureStudio?.display.bounds;
    if (!studioBounds) {
      return true;
    }
    return x >= studioBounds.x && x <= studioBounds.x + studioBounds.width && y >= studioBounds.y && y <= studioBounds.y + studioBounds.height;
  }
  onClickStreamStopped() {
    this.completeStudioSession(true);
  }
  async confirmOverlaySelection(rect) {
    const pending = this.pendingAreaSelection;
    if (!pending) {
      throw new Error("No pending area selection was found.");
    }
    const normalized = this.normalizeRect(rect, pending.displayBounds, pending.image.getSize());
    if (normalized.width < 8 || normalized.height < 8) {
      throw new Error("The selected area is too small. Please drag a larger region.");
    }
    try {
      const croppedImage = pending.image.crop(normalized);
      const permissions = await this.permissionsService.getSnapshot();
      const currentState = this.captureService.getState().status === "recording" ? this.captureService.getState() : this.captureService.start("guide");
      const stepNumber = pending.input.project.steps.length + 1;
      const annotatedScreenshot = await this.annotateCaptureOnImage(
        croppedImage.toPNG(),
        croppedImage.getSize(),
        { stepNumber }
      );
      const result = await this.projectService.addCapturedStep({
        project: pending.input.project,
        screenshot: annotatedScreenshot,
        title: pending.input.title?.trim() || `Step ${String(stepNumber).padStart(2, "0")}. Capture the selected area`,
        notes: pending.input.notes?.trim() || "Describe what the operator should focus on inside this selected area, then note the expected visible result.",
        width: croppedImage.getSize().width,
        height: croppedImage.getSize().height,
        displayLabel: pending.displayLabel
      });
      this.finishAreaSelection({
        project: result.project,
        capturedStep: result.capturedStep,
        asset: result.asset,
        captureState: currentState,
        permissions
      });
    } catch (error) {
      pending.reject(error);
      this.resetAreaSelectionState();
      this.windowService.closeCaptureWindows();
      this.windowService.showMainWindow();
      throw error;
    }
  }
  async cancelAreaSelection() {
    if (this.pendingClickStreamHandoff) {
      this.pendingClickStreamHandoff = null;
      this.overlayPayload = null;
      this.windowService.closeCaptureWindows();
      this.windowService.showMainWindow();
      this.captureService.reset();
      this.emitClickStreamStatus("stopped");
      return;
    }
    if (this.clickCaptureStudio) {
      this.completeStudioSession(true);
      this.captureService.reset();
      this.emitClickStreamStatus("stopped");
      return;
    }
    if (!this.pendingAreaSelection) {
      return;
    }
    this.finishAreaSelection(null);
  }
  recordStudioStep(result) {
    if (!this.clickCaptureStudio) {
      return;
    }
    this.clickCaptureStudio.input = {
      ...this.clickCaptureStudio.input,
      project: result.project
    };
    this.clickCaptureStudio.latestStep = this.buildStudioLatestStep(result.capturedStep);
    this.overlayPayload = this.createStudioOverlayPayload();
    this.syncStudioChrome();
    this.emitStudioChanged();
    void this.refreshStudioBackdrop();
  }
  buildStudioLatestStep(step) {
    return {
      stepId: step.id,
      stepNumber: step.stepNumber ?? 0,
      title: step.title,
      notes: step.notes,
      assetAppUrl: step.asset?.appUrl ?? ""
    };
  }
  createStudioOverlayPayload() {
    if (!this.clickCaptureStudio) {
      return null;
    }
    return {
      mode: "click-stream-studio",
      displayLabel: this.clickCaptureStudio.display.label,
      displayBounds: {
        width: this.clickCaptureStudio.display.bounds.width,
        height: this.clickCaptureStudio.display.bounds.height
      },
      imageDataUrl: this.clickCaptureStudio.backdropImageDataUrl,
      imageSize: this.clickCaptureStudio.backdropImageSize,
      studio: this.getStudioPayload() ?? void 0
    };
  }
  emitStudioChanged() {
    this.emit("studio-changed", this.getStudioPayload());
  }
  syncStudioChrome() {
    const studio = this.clickCaptureStudio;
    if (!studio) {
      return;
    }
    this.windowService.setCaptureOverlayInteractive(
      studio.cropperVisible && studio.phase !== "recording"
    );
    if (studio.phase === "recording") {
      this.windowService.resizeCaptureControlsWindow(this.getCaptureControlsLayout(studio));
    }
  }
  ensureCaptureControlsWindow() {
    const studio = this.clickCaptureStudio;
    if (!studio) {
      return;
    }
    if (this.windowService.getCaptureControlsWindow()) {
      return;
    }
    this.windowService.createCaptureControlsWindow(
      studio.display.bounds,
      this.getCaptureControlsLayout(studio)
    );
  }
  getCaptureControlsLayout(studio) {
    const width = studio.latestStep ? 306 : 286;
    if (studio.phase === "setup") {
      return {
        width,
        height: 318
      };
    }
    if (studio.phase === "paused") {
      return {
        width,
        height: 374
      };
    }
    return {
      width,
      height: studio.latestStep ? 476 : 210
    };
  }
  async refreshStudioActiveWindowTarget() {
    if (!this.clickCaptureStudio) {
      return;
    }
    this.windowService.hideCaptureChrome();
    await delay(100);
    const activeWindow = this.activeWindowService.getSnapshot();
    const target = this.resolveActiveWindowTarget(this.clickCaptureStudio.display, activeWindow);
    this.windowService.showCaptureChrome();
    this.syncStudioChrome();
    if (!target) {
      this.clickCaptureStudio.activeWindowBounds = null;
      this.clickCaptureStudio.activeWindowLabel = "Active window will be inferred from your next click.";
      return;
    }
    this.updateStudioActiveWindowState(target.bounds, target.label);
  }
  updateStudioActiveWindowState(bounds, label) {
    if (!this.clickCaptureStudio) {
      return;
    }
    this.clickCaptureStudio.activeWindowBounds = { ...bounds };
    this.clickCaptureStudio.activeWindowLabel = label;
  }
  resolveActiveWindowTarget(display, activeWindow) {
    const bounds = activeWindow?.bounds;
    if (!bounds) {
      return null;
    }
    const left = Math.max(display.bounds.x, bounds.x);
    const top = Math.max(display.bounds.y, bounds.y);
    const right = Math.min(display.bounds.x + display.bounds.width, bounds.x + bounds.width);
    const bottom = Math.min(display.bounds.y + display.bounds.height, bounds.y + bounds.height);
    if (right <= left || bottom <= top) {
      return null;
    }
    return {
      bounds: {
        x: left - display.bounds.x,
        y: top - display.bounds.y,
        width: right - left,
        height: bottom - top
      },
      label: activeWindow?.windowTitle || activeWindow?.appName || "Active window"
    };
  }
  getStudioSelectionForDisplay(displayBounds) {
    if (!this.clickCaptureStudio) {
      return null;
    }
    return clampRectToBounds(
      {
        ...this.clickCaptureStudio.selectedRegion
      },
      {
        width: displayBounds.width,
        height: displayBounds.height
      }
    );
  }
  createDefaultStudioSelection(displayBounds) {
    const width = Math.min(1280, Math.round(displayBounds.width * 0.68));
    const height = Math.min(540, Math.round(displayBounds.height * 0.5));
    return {
      x: Math.max(24, Math.round((displayBounds.width - width) / 2)),
      y: Math.max(32, Math.round((displayBounds.height - height) / 2) - 96),
      width,
      height
    };
  }
  async capturePrimaryDisplay() {
    return this.captureDisplayFromElectronDisplay(electron.screen.getPrimaryDisplay());
  }
  async captureDisplayPreview(display) {
    const electronDisplay = this.resolveElectronDisplay(display);
    if (!electronDisplay) {
      throw new Error("Unable to find the selected display for capture preview.");
    }
    const permissions = await this.permissionsService.getSnapshot();
    if (!permissions.canCaptureScreens) {
      throw new Error(
        "Screen capture is not available yet. Grant Screen Recording permission and retry."
      );
    }
    const { image } = await this.captureDisplayThumbnail(electronDisplay, 2300);
    return { image };
  }
  async captureDisplayAtPoint(x, y, maxCaptureWidth = 2300) {
    return this.captureDisplayFromElectronDisplay(
      electron.screen.getDisplayNearestPoint({ x, y }),
      maxCaptureWidth
    );
  }
  async captureDisplayFromElectronDisplay(electronDisplay, maxCaptureWidth = 2300) {
    const permissions = await this.permissionsService.getSnapshot();
    if (!permissions.canCaptureScreens) {
      throw new Error(
        "Screen capture is not available yet. Grant Screen Recording permission and retry."
      );
    }
    const { image, label } = await this.captureDisplayThumbnail(electronDisplay, maxCaptureWidth);
    const currentState = this.captureService.getState().status === "recording" ? this.captureService.getState() : this.captureService.start("guide");
    return {
      image,
      display: {
        id: String(electronDisplay.id),
        bounds: electronDisplay.bounds,
        label
      },
      permissions,
      currentState
    };
  }
  resolveElectronDisplay(display) {
    return electron.screen.getAllDisplays().find(
      (electronDisplay) => String(electronDisplay.id) === display.id || electronDisplay.bounds.x === display.bounds.x && electronDisplay.bounds.y === display.bounds.y && electronDisplay.bounds.width === display.bounds.width && electronDisplay.bounds.height === display.bounds.height
    ) ?? null;
  }
  async captureDisplayThumbnail(electronDisplay, maxCaptureWidth) {
    const captureWidth = Math.min(
      Math.round(electronDisplay.size.width * electronDisplay.scaleFactor),
      maxCaptureWidth
    );
    const aspectRatio = electronDisplay.size.width / electronDisplay.size.height;
    const captureHeight = Math.max(1, Math.round(captureWidth / aspectRatio));
    const sources = await electron.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: captureWidth,
        height: captureHeight
      },
      fetchWindowIcons: false
    });
    const matchingSource = sources.find((source) => source.display_id === String(electronDisplay.id)) ?? sources[0];
    if (!matchingSource || matchingSource.thumbnail.isEmpty()) {
      throw new Error("Unable to capture the current display. The returned thumbnail is empty.");
    }
    return {
      image: matchingSource.thumbnail,
      label: matchingSource.name || `Display ${electronDisplay.id}`
    };
  }
  async refreshStudioBackdrop() {
    if (!this.clickCaptureStudio || this.clickCaptureStudio.phase === "recording") {
      return;
    }
    try {
      this.windowService.hideCaptureChrome();
      await delay(90);
      const backdrop = await this.captureDisplayPreview(this.clickCaptureStudio.display);
      if (!this.clickCaptureStudio) {
        return;
      }
      this.clickCaptureStudio.backdropImageDataUrl = backdrop.image.toDataURL();
      this.clickCaptureStudio.backdropImageSize = backdrop.image.getSize();
      this.overlayPayload = this.createStudioOverlayPayload();
      this.windowService.showCaptureChrome();
      this.syncStudioChrome();
      this.emitStudioChanged();
    } catch (error) {
      this.windowService.showCaptureChrome();
      this.syncStudioChrome();
      this.emit("error", error);
    }
  }
  async annotateCaptureOnImage(screenshot, imageSize, options) {
    const { default: sharp2 } = await import("sharp");
    const stepBadgeText = `STEP ${String(options.stepNumber).padStart(2, "0")}`;
    const stepBadgeWidth = Math.max(120, 44 + stepBadgeText.length * 14);
    const stepBadge = `
      <g>
        <rect x="28" y="28" rx="18" ry="18" width="${stepBadgeWidth}" height="44" fill="rgba(18,24,30,0.84)" stroke="rgba(255,255,255,0.34)" stroke-width="1.5"/>
        <text x="${28 + stepBadgeWidth / 2}" y="56" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${stepBadgeText}</text>
      </g>
    `;
    let clickOverlay = "";
    if (options.clickPoint && options.displayBounds && options.clickIndex) {
      const scaleX = imageSize.width / options.displayBounds.width;
      const scaleY = imageSize.height / options.displayBounds.height;
      const markerX = Math.round(options.clickPoint.x * scaleX);
      const markerY = Math.round(options.clickPoint.y * scaleY);
      const highlightRadius = Math.max(
        44,
        Math.round(Math.min(imageSize.width, imageSize.height) * 0.04)
      );
      const ringRadius = Math.round(highlightRadius * 0.64);
      const cursorWidth = Math.max(56, Math.round(highlightRadius * 1.15));
      const cursorHeight = Math.round(cursorWidth * 1.26);
      const cursorLeft = Math.max(0, Math.min(imageSize.width - cursorWidth, markerX - 20));
      const cursorTop = Math.max(0, Math.min(imageSize.height - cursorHeight, markerY + 12));
      const clickBadgeSize = 34;
      const clickBadgeX = Math.max(
        16,
        Math.min(imageSize.width - clickBadgeSize - 16, markerX + highlightRadius * 0.52)
      );
      const clickBadgeY = Math.max(
        16,
        Math.min(imageSize.height - clickBadgeSize - 16, markerY - highlightRadius * 0.92)
      );
      const cursorPath = `
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
      `;
      clickOverlay = `
        <circle cx="${markerX}" cy="${markerY}" r="${highlightRadius}" fill="rgba(241, 200, 64, 0.42)" filter="url(#softGlow)" />
        <circle cx="${markerX}" cy="${markerY}" r="${ringRadius}" fill="rgba(241, 200, 64, 0.16)" stroke="rgba(241, 200, 64, 0.88)" stroke-width="2" />
        <rect x="${clickBadgeX}" y="${clickBadgeY}" rx="17" ry="17" width="${clickBadgeSize}" height="${clickBadgeSize}" fill="rgba(18,24,30,0.88)" stroke="rgba(255,255,255,0.86)" stroke-width="1.5"/>
        <text x="${clickBadgeX + clickBadgeSize / 2}" y="${clickBadgeY + 23}" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="17" font-weight="700" fill="#ffffff">${options.clickIndex}</text>
        <g transform="translate(${cursorLeft}, ${cursorTop}) scale(${cursorWidth / 42})" filter="url(#cursorShadow)">
          <path d="${cursorPath}" fill="#ffffff" stroke="#111111" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
        </g>
      `;
    }
    const svg = `
      <svg width="${imageSize.width}" height="${imageSize.height}" viewBox="0 0 ${imageSize.width} ${imageSize.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="cursorShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="rgba(0,0,0,0.22)"/>
          </filter>
        </defs>
        ${stepBadge}
        ${clickOverlay}
      </svg>
    `;
    return sharp2(screenshot).composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0
      }
    ]).png().toBuffer();
  }
  buildClickCaptureEvent(clickEvent, display, sequence) {
    const localX = clickEvent.x - display.bounds.x;
    const localY = clickEvent.y - display.bounds.y;
    return {
      index: sequence,
      button: this.describeMouseButton(clickEvent.button),
      clicks: clickEvent.clicks,
      screenX: clickEvent.x,
      screenY: clickEvent.y,
      regionLabel: this.describeRegion(localX, localY, display.bounds.width, display.bounds.height),
      displayLabel: display.label,
      capturedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  describeMouseButton(button) {
    if (button === 1) return "left click";
    if (button === 2) return "right click";
    if (button === 3) return "middle click";
    return `button ${button}`;
  }
  describeRegion(x, y, width, height) {
    const horizontal = x < width / 3 ? "left" : x > width * 2 / 3 ? "right" : "center";
    const vertical = y < height / 3 ? "top" : y > height * 2 / 3 ? "bottom" : "middle";
    return `${vertical}-${horizontal}`;
  }
  normalizeRect(rect, displayBounds, imageSize) {
    const x = Math.max(0, Math.min(rect.x, displayBounds.width));
    const y = Math.max(0, Math.min(rect.y, displayBounds.height));
    const width = Math.max(0, Math.min(rect.width, displayBounds.width - x));
    const height = Math.max(0, Math.min(rect.height, displayBounds.height - y));
    const scaleX = imageSize.width / displayBounds.width;
    const scaleY = imageSize.height / displayBounds.height;
    return {
      x: Math.round(x * scaleX),
      y: Math.round(y * scaleY),
      width: Math.round(width * scaleX),
      height: Math.round(height * scaleY)
    };
  }
  finishAreaSelection(result) {
    const pending = this.pendingAreaSelection;
    if (!pending) {
      return;
    }
    pending.resolve(toPlainResult(result));
    this.resetAreaSelectionState();
    this.windowService.closeCaptureWindows();
    this.windowService.showMainWindow();
  }
  resetAreaSelectionState() {
    this.pendingAreaSelection = null;
    this.overlayPayload = null;
  }
  emitClickStreamStatus(status) {
    this.emit("click-stream-status", status);
  }
}
class WindowService {
  mainWindow = null;
  overlayWindow = null;
  captureControlsWindow = null;
  getLiveMainWindow() {
    if (!this.mainWindow) {
      return null;
    }
    if (this.mainWindow.isDestroyed()) {
      this.mainWindow = null;
      return null;
    }
    return this.mainWindow;
  }
  createMainWindow() {
    const window = new electron.BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 1120,
      minHeight: 760,
      backgroundColor: "#f3ede0",
      title: "easyDo",
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.cjs"),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    window.once("ready-to-show", () => {
      window.show();
    });
    window.webContents.setWindowOpenHandler(({ url }) => {
      void electron.shell.openExternal(url);
      return { action: "deny" };
    });
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
      void window.loadURL(rendererUrl);
    } else {
      void window.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
    window.on("closed", () => {
      if (this.mainWindow === window) {
        this.mainWindow = null;
      }
    });
    this.mainWindow = window;
    return window;
  }
  getMainWindow() {
    return this.getLiveMainWindow();
  }
  hideMainWindow() {
    this.getLiveMainWindow()?.hide();
  }
  showMainWindow() {
    const window = this.getLiveMainWindow();
    if (!window) {
      return;
    }
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
  }
  createCaptureOverlayWindow(bounds) {
    this.closeCaptureOverlayWindow();
    const window = new electron.BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      roundedCorners: false,
      hasShadow: false,
      focusable: true,
      acceptFirstMouse: true,
      enableLargerThanScreen: true,
      backgroundColor: "#00000000",
      title: "easyDo Capture Overlay",
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
      void window.loadURL(`${rendererUrl}#/capture-overlay`);
    } else {
      void window.loadFile(path.join(__dirname, "../renderer/index.html"), {
        hash: "/capture-overlay"
      });
    }
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setAlwaysOnTop(true, "screen-saver", 1);
    window.setContentProtection(true);
    window.once("ready-to-show", () => {
      window.show();
      window.focus();
    });
    window.on("closed", () => {
      if (this.overlayWindow === window) {
        this.overlayWindow = null;
      }
    });
    this.overlayWindow = window;
    return window;
  }
  createCaptureControlsWindow(bounds, layout = { width: 286, height: 318 }) {
    this.closeCaptureControlsWindow();
    const { width, height } = layout;
    const x = bounds.x + bounds.width - width - 88;
    const y = bounds.y + Math.max(72, Math.round(bounds.height * 0.32));
    const window = new electron.BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      closable: true,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      roundedCorners: false,
      hasShadow: true,
      acceptFirstMouse: true,
      enableLargerThanScreen: true,
      backgroundColor: "#00000000",
      title: "easyDo Capture Controls",
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
      void window.loadURL(`${rendererUrl}#/capture-controls`);
    } else {
      void window.loadFile(path.join(__dirname, "../renderer/index.html"), {
        hash: "/capture-controls"
      });
    }
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setAlwaysOnTop(true, "screen-saver", 1);
    window.setContentProtection(true);
    window.once("ready-to-show", () => {
      window.show();
      window.focus();
    });
    window.on("closed", () => {
      if (this.captureControlsWindow === window) {
        this.captureControlsWindow = null;
      }
    });
    this.captureControlsWindow = window;
    return window;
  }
  resizeCaptureControlsWindow(layout) {
    if (!this.captureControlsWindow || this.captureControlsWindow.isDestroyed()) {
      return;
    }
    const bounds = this.captureControlsWindow.getBounds();
    this.captureControlsWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: layout.width,
      height: layout.height
    });
  }
  setCaptureOverlayInteractive(interactive) {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      return;
    }
    this.overlayWindow.setIgnoreMouseEvents(!interactive, { forward: true });
  }
  hideCaptureChrome() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide();
    }
    if (this.captureControlsWindow && !this.captureControlsWindow.isDestroyed()) {
      this.captureControlsWindow.hide();
    }
  }
  showCaptureChrome() {
    const revealChrome = () => {
      if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
        this.overlayWindow.showInactive();
      }
      if (this.captureControlsWindow && !this.captureControlsWindow.isDestroyed()) {
        this.captureControlsWindow.showInactive();
      }
    };
    if (process.platform === "darwin") {
      electron.app.hide();
      setTimeout(() => {
        electron.app.show();
        setTimeout(revealChrome, 100);
      }, 100);
      return;
    }
    revealChrome();
  }
  closeCaptureOverlayWindow() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close();
    }
    this.overlayWindow = null;
  }
  getCaptureOverlayWindow() {
    return this.overlayWindow;
  }
  closeCaptureControlsWindow() {
    if (this.captureControlsWindow && !this.captureControlsWindow.isDestroyed()) {
      this.captureControlsWindow.close();
    }
    this.captureControlsWindow = null;
  }
  closeCaptureWindows() {
    this.closeCaptureOverlayWindow();
    this.closeCaptureControlsWindow();
  }
  getCaptureControlsWindow() {
    return this.captureControlsWindow;
  }
}
const windowService = new WindowService();
const captureService = new CaptureService();
const iohookService = new IOHookService();
const permissionsService = new PermissionsService();
const activeWindowService = new ActiveWindowService();
const appUiService = new AppUiService();
const projectService = new ProjectService();
const ocrService = new OcrService();
const exportService = new ExportService();
const screenCaptureService = new ScreenCaptureService(
  captureService,
  permissionsService,
  activeWindowService,
  projectService,
  windowService
);
const clickStreamService = new ClickStreamService(
  iohookService,
  captureService,
  permissionsService,
  screenCaptureService,
  windowService
);
electron.app.setName("easyDo");
async function bootstrap() {
  registerAssetProtocol();
  registerAppIpc(appUiService);
  registerProjectIpc(projectService, ocrService);
  registerExportIpc(exportService);
  registerCaptureIpc(
    captureService,
    permissionsService,
    screenCaptureService,
    clickStreamService,
    () => windowService.getMainWindow()?.webContents ?? null
  );
  electron.app.on("activate", () => {
    if (!windowService.getMainWindow()) {
      windowService.createMainWindow();
      return;
    }
    windowService.showMainWindow();
  });
  electron.app.on("window-all-closed", () => {
    iohookService.stop();
    void ocrService.terminate();
    if (process.platform !== "darwin") {
      electron.app.quit();
    }
  });
  windowService.createMainWindow();
}
electron.app.whenReady().then(() => {
  void bootstrap();
});
