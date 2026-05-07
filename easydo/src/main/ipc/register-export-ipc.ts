import { ipcMain } from "electron";
import { ExportService } from "@main/services/export.service";
import type { ExportHtmlInput } from "@shared/contracts";

export function registerExportIpc(exportService: ExportService): void {
  ipcMain.handle("exports:preview-html", (_event, input: ExportHtmlInput) =>
    exportService.previewHtml(input.project)
  );
  ipcMain.handle("exports:html", (_event, input: ExportHtmlInput) =>
    exportService.exportHtml(input.project)
  );
  ipcMain.handle("exports:open-path", (_event, absolutePath: string) =>
    exportService.openPath(absolutePath)
  );
}
