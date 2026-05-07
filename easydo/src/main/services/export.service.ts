import { stat, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { dialog, shell } from "electron";
import type { ExportHtmlResult, ProjectDraft } from "@shared/contracts";
import { buildExportHtml, buildPreviewHtml } from "@shared/html-export";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export class ExportService {
  async previewHtml(project: ProjectDraft): Promise<string> {
    return buildPreviewHtml(project);
  }

  async exportHtml(project: ProjectDraft): Promise<ExportHtmlResult> {
    const suggestedName = `${slugify(project.name || "workflow") || "workflow"}.html`;
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Export workflow as HTML",
      defaultPath: basename(suggestedName),
      filters: [{ name: "HTML", extensions: ["html"] }]
    });

    if (canceled || !filePath) {
      throw new Error("HTML export was canceled.");
    }

    const html = await buildExportHtml(project);
    await writeFile(filePath, html, "utf8");
    const fileInfo = await stat(filePath);

    return {
      absolutePath: filePath,
      fileUrl: pathToFileURL(filePath).toString(),
      exportedAt: new Date().toISOString(),
      fileSize: fileInfo.size,
      themeTone: project.theme.tone
    };
  }

  async openPath(absolutePath: string): Promise<string> {
    return shell.openPath(absolutePath);
  }
}
