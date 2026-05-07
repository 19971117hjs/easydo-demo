import { app, clipboard, ipcMain } from "electron";
import type { AppOverview, EditorUiPrefs } from "@shared/contracts";
import type { AppUiService } from "@main/services/app-ui.service";

export function registerAppIpc(appUiService: AppUiService): void {
  ipcMain.handle("app:get-overview", (): AppOverview => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    userDataPath: app.getPath("userData")
  }));
  ipcMain.handle("app:get-editor-ui-prefs", (): Promise<EditorUiPrefs> => appUiService.getEditorUiPrefs());
  ipcMain.handle(
    "app:patch-editor-ui-prefs",
    (_event, patch: Partial<EditorUiPrefs>): Promise<EditorUiPrefs> => appUiService.patchEditorUiPrefs(patch)
  );
  ipcMain.handle("app:write-clipboard-text", (_event, text: string) => {
    clipboard.writeText(text);
  });
}
