import { app } from "electron";
import { registerAppIpc } from "@main/ipc/register-app-ipc";
import { registerAssetProtocol } from "@main/register-asset-protocol";
import { registerCaptureIpc } from "@main/ipc/register-capture-ipc";
import { registerExportIpc } from "@main/ipc/register-export-ipc";
import { registerProjectIpc } from "@main/ipc/register-project-ipc";
import { CaptureService } from "@main/services/capture.service";
import { ActiveWindowService } from "@main/services/active-window.service";
import { AppUiService } from "@main/services/app-ui.service";
import { ClickStreamService } from "@main/services/click-stream.service";
import { ExportService } from "@main/services/export.service";
import { IOHookService } from "@main/services/iohook.service";
import { OcrService } from "@main/services/ocr.service";
import { PermissionsService } from "@main/services/permissions.service";
import { ProjectService } from "@main/services/project.service";
import { ScreenCaptureService } from "@main/services/screen-capture.service";
import { WindowService } from "@main/services/window.service";

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

app.setName("easyDo");

async function bootstrap(): Promise<void> {
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

  app.on("activate", () => {
    if (!windowService.getMainWindow()) {
      windowService.createMainWindow();
      return;
    }

    windowService.showMainWindow();
  });

  app.on("window-all-closed", () => {
    iohookService.stop();
    void ocrService.terminate();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  windowService.createMainWindow();
}

app.whenReady().then(() => {
  void bootstrap();
});
