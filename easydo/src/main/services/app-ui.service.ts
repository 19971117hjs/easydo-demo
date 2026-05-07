import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EditorUiPrefs } from "@shared/contracts";

const DEFAULT_EDITOR_UI_PREFS: EditorUiPrefs = {
  appUiEditorLeftSidebarWidth: 248,
  appUiEditorRightSidebarWidth: 340,
  appUiEditorLeftSidebarOpened: true,
  appUiEditorRightSidebarOpened: true,
  appSettingFocusedViewForNewGuides: true,
  appUiStepsListGridView: true
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeEditorUiPrefs(input?: Partial<EditorUiPrefs> | null): EditorUiPrefs {
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
    appUiEditorLeftSidebarOpened:
      input?.appUiEditorLeftSidebarOpened ?? DEFAULT_EDITOR_UI_PREFS.appUiEditorLeftSidebarOpened,
    appUiEditorRightSidebarOpened:
      input?.appUiEditorRightSidebarOpened ?? DEFAULT_EDITOR_UI_PREFS.appUiEditorRightSidebarOpened,
    appSettingFocusedViewForNewGuides:
      input?.appSettingFocusedViewForNewGuides ??
      DEFAULT_EDITOR_UI_PREFS.appSettingFocusedViewForNewGuides,
    appUiStepsListGridView: input?.appUiStepsListGridView ?? DEFAULT_EDITOR_UI_PREFS.appUiStepsListGridView
  };
}

export class AppUiService {
  private async getPrefsPath(): Promise<string> {
    return join(app.getPath("userData"), "ui-prefs.json");
  }

  async getEditorUiPrefs(): Promise<EditorUiPrefs> {
    const filePath = await this.getPrefsPath();

    try {
      const raw = await readFile(filePath, "utf8");
      return normalizeEditorUiPrefs(JSON.parse(raw) as Partial<EditorUiPrefs>);
    } catch {
      return { ...DEFAULT_EDITOR_UI_PREFS };
    }
  }

  async patchEditorUiPrefs(patch: Partial<EditorUiPrefs>): Promise<EditorUiPrefs> {
    const filePath = await this.getPrefsPath();
    const current = await this.getEditorUiPrefs();
    const next = normalizeEditorUiPrefs({
      ...current,
      ...patch
    });

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(next, null, 2), "utf8");
    return next;
  }
}
