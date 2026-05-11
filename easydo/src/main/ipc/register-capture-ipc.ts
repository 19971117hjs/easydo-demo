import { BrowserWindow, ipcMain, WebContents } from "electron";
import type {
  CaptureTargetMode,
  CaptureState,
  CaptureStepInput,
  SelectionRect,
  UpdateCaptureStudioLatestStepInput
} from "@shared/contracts";
import { CaptureService } from "@main/services/capture.service";
import { PermissionsService } from "@main/services/permissions.service";
import { ScreenCaptureService } from "@main/services/screen-capture.service";
import { ClickStreamService } from "@main/services/click-stream.service";

function broadcast(target: WebContents, state: CaptureState): void {
  target.send("capture:state-changed", state);
}

function broadcastToAll(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

export function registerCaptureIpc(
  captureService: CaptureService,
  permissionsService: PermissionsService,
  screenCaptureService: ScreenCaptureService,
  clickStreamService: ClickStreamService,
  getWebContents: () => WebContents | null
): void {
  ipcMain.handle("capture:get-state", () => captureService.getState());
  ipcMain.handle("capture:get-permissions", () => permissionsService.getSnapshot());
  ipcMain.handle("capture:prepare", (_event, mode?: CaptureState["mode"]) =>
    captureService.prepare(mode)
  );
  ipcMain.handle("capture:start", (_event, mode?: CaptureState["mode"]) =>
    captureService.start(mode)
  );
  ipcMain.handle("capture:pause", () => captureService.pause());
  ipcMain.handle("capture:stop", () => captureService.stop());
  ipcMain.handle("capture:capture-step", (_event, input: CaptureStepInput) =>
    screenCaptureService.captureStep(input)
  );
  ipcMain.handle("capture:begin-area-selection", (_event, input: CaptureStepInput) =>
    screenCaptureService.beginAreaSelection(input)
  );
  ipcMain.handle("capture:get-overlay-payload", () => screenCaptureService.getOverlayPayload());
  ipcMain.handle("capture:get-studio-payload", () => screenCaptureService.getStudioPayload());
  ipcMain.handle("capture:confirm-overlay-selection", (_event, rect: SelectionRect) =>
    screenCaptureService.confirmOverlaySelection(rect)
  );
  ipcMain.handle("capture:continue-overlay-click-stream", () =>
    screenCaptureService.continueOverlayClickStream()
  );
  ipcMain.handle("capture:cancel-overlay-selection", () =>
    screenCaptureService.cancelAreaSelection()
  );
  ipcMain.handle("capture:start-click-stream", (_event, input: CaptureStepInput) =>
    screenCaptureService.beginClickStreamHandoff(input)
  );
  ipcMain.handle("capture:start-studio-capture", async () => {
    const input = screenCaptureService.getStudioCaptureInput();
    if (!input) {
      throw new Error("No click capture studio session is ready to start.");
    }

    await clickStreamService.assertCanStartSession(true);
    screenCaptureService.prepareStudioForRecording();
    return clickStreamService.startSession(input);
  });
  ipcMain.handle("capture:pause-studio-capture", () => {
    screenCaptureService.pauseStudioSession();
    return clickStreamService.pauseSession();
  });
  ipcMain.handle("capture:resume-studio-capture", () => {
    screenCaptureService.resumeStudioSession();
    return clickStreamService.resumeSession();
  });
  ipcMain.handle("capture:finish-studio-capture", () => {
    if (clickStreamService.isActive()) {
      return clickStreamService.stopSession();
    }

    return screenCaptureService.finishStudioWithoutRecording();
  });
  ipcMain.handle("capture:set-studio-capture-mode", (_event, mode: CaptureTargetMode) =>
    screenCaptureService.setStudioCaptureMode(mode)
  );
  ipcMain.handle("capture:set-studio-selection-rect", (_event, rect: SelectionRect) =>
    screenCaptureService.setStudioSelectionRect(rect)
  );
  ipcMain.handle("capture:set-studio-cropper-visible", (_event, visible: boolean) =>
    screenCaptureService.setStudioCropperVisible(visible)
  );
  ipcMain.on("capture:accept-overlay-mouse", () => {
    screenCaptureService.acceptOverlayMouse();
  });
  ipcMain.on("capture:ignore-overlay-mouse", () => {
    screenCaptureService.ignoreOverlayMouse();
  });
  ipcMain.handle("capture:update-studio-latest-step", async (_event, input: UpdateCaptureStudioLatestStepInput) => {
    const payload = await screenCaptureService.updateStudioLatestStep(input);
    const project = screenCaptureService.getStudioCaptureInput()?.project;
    if (project) {
      clickStreamService.syncProject(project);
    }
    return payload;
  });
  ipcMain.handle("capture:delete-studio-latest-step", async () => {
    const payload = await screenCaptureService.deleteStudioLatestStep();
    const project = screenCaptureService.getStudioCaptureInput()?.project;
    if (project) {
      clickStreamService.syncProject(project);
    }
    return payload;
  });
  ipcMain.handle("capture:stop-click-stream", () => clickStreamService.stopSession());

  captureService.on("changed", (state: CaptureState) => {
    const webContents = getWebContents();
    if (webContents) {
      broadcast(webContents, state);
    }
  });

  clickStreamService.on("step-created", (result) => {
    const webContents = getWebContents();
    if (webContents) {
      webContents.send("capture:auto-step-created", result);
    }
  });

  clickStreamService.on("status", (status) => {
    broadcastToAll("capture:click-stream-status", status);
  });

  clickStreamService.on("error", (error) => {
    broadcastToAll("capture:click-stream-error", String(error));
  });

  clickStreamService.on("progress", (progress) => {
    broadcastToAll("capture:click-stream-progress", progress);
  });

  screenCaptureService.on("click-stream-status", (status) => {
    broadcastToAll("capture:click-stream-status", status);
  });

  screenCaptureService.on("click-stream-error", (error) => {
    broadcastToAll("capture:click-stream-error", String(error));
  });

  screenCaptureService.on("studio-changed", (payload) => {
    broadcastToAll("capture:studio-changed", payload);
  });
}
