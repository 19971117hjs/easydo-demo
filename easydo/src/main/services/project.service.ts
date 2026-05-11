import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { app, dialog } from "electron";
import sharp from "sharp";
import type {
  CropStepAssetInput,
  CropStepAssetResult,
  CreateFolderInput,
  CreateProjectInput,
  DeleteFolderInput,
  DeleteProjectsInput,
  DuplicateProjectInput,
  ImportAnnotationAssetInput,
  ImportAnnotationAssetResult,
  ImportProjectImagesInput,
  ImportProjectImagesResult,
  ProjectDraft,
  ProjectCover,
  ProjectFolder,
  ProjectGuideSettings,
  ProjectLibrary,
  ProjectPlaceholders,
  ProjectTheme,
  ProjectSummary,
  RenameFolderInput,
  SaveProjectInput,
  StepAssetRef,
  StepDraft,
  StepSettings,
  UpdateProjectMetaInput,
  MoveProjectsInput,
  StepAnnotation
} from "@shared/contracts";
import { createAnnotationId, cropStepAnnotations, normalizeStepAnnotations } from "@shared/step-annotations";
import { htmlToPlainText, normalizeNotesHtml } from "@shared/step-content";

function createId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultProjectName(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `Untitled - ${day}-${month}-${year}`;
}

function toAssetAppUrl(absolutePath: string): string {
  return `easydo-asset://local/${encodeURIComponent(absolutePath)}`;
}

function defaultProjectCover(_name = defaultProjectName(), description = ""): ProjectCover {
  return {
    kicker: "Workflow Playbook",
    subtitle: description || "Capture the exact sequence, edge cases, and visual checkpoints for a repeatable task.",
    audience: "Operations, support, and onboarding teams",
    outcome: "Ship a guide that a teammate can follow without shadowing you live."
  };
}

function defaultProjectTheme(): ProjectTheme {
  return {
    tone: "sunrise"
  };
}

function defaultGuideSettings(): ProjectGuideSettings {
  return {
    showCoverPage: true,
    showStepNumbers: true,
    useFocusedViewByDefault: true,
    defaultExportFormat: "rich-html"
  };
}

function defaultPlaceholders(): ProjectPlaceholders {
  return {
    productName: "Product",
    workspaceName: "Workspace",
    teamName: "Operations",
    ownerName: "Guide Owner"
  };
}

function defaultStepSettings(kind: StepDraft["kind"] = "action"): StepSettings {
  return {
    forceNewPage: false,
    isContentBlock: kind === "content" || kind === "note",
    isMultiCaptureStep: false,
    includeSubstepTitles: true,
    showStepNumber: kind !== "content"
  };
}

function normalizeFolder(folder: ProjectFolder): ProjectFolder {
  const now = new Date().toISOString();
  return {
    id: folder.id,
    name: folder.name?.trim() || "New Folder",
    createdAt: folder.createdAt || now,
    updatedAt: folder.updatedAt || folder.createdAt || now
  };
}

function normalizeProject(project: ProjectDraft): ProjectDraft {
  const now = new Date().toISOString();
  const cover = {
    ...defaultProjectCover(project.name, project.description),
    ...(project.cover ?? {})
  };
  const theme = {
    ...defaultProjectTheme(),
    ...(project.theme ?? {})
  };
  const guideSettings = {
    ...defaultGuideSettings(),
    ...(project.guideSettings ?? {})
  };
  const placeholders = {
    ...defaultPlaceholders(),
    ...(project.placeholders ?? {})
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
        ...(step.settings ?? {})
      },
      cropRestoreState: step.cropRestoreState
        ? {
            ...step.cropRestoreState,
            annotations: normalizeStepAnnotations(step.cropRestoreState.annotations),
            asset: {
              ...step.cropRestoreState.asset,
              appUrl:
                step.cropRestoreState.asset.appUrl ||
                toAssetAppUrl(step.cropRestoreState.asset.absolutePath)
            }
          }
        : null,
      annotations: normalizeStepAnnotations(step.annotations).map((annotation) => ({
        ...annotation,
        asset: annotation.asset
          ? {
              ...annotation.asset,
              appUrl: annotation.asset.appUrl || toAssetAppUrl(annotation.asset.absolutePath)
            }
          : annotation.asset
      })),
      asset: step.asset
        ? {
            ...step.asset,
            appUrl: step.asset.appUrl || toAssetAppUrl(step.asset.absolutePath)
          }
        : step.asset
    }))
  };
}

function normalizeProjectAssets(project: ProjectDraft): ProjectDraft {
  return normalizeProject(project);
}

export class ProjectService {
  private async getDataDir(): Promise<string> {
    const directory = join(app.getPath("userData"), "easydo-data");
    await mkdir(directory, { recursive: true });
    return directory;
  }

  private async getProjectsDir(): Promise<string> {
    const directory = join(await this.getDataDir(), "projects");
    await mkdir(directory, { recursive: true });
    return directory;
  }

  private async getFoldersFilePath(): Promise<string> {
    return join(await this.getDataDir(), "folders.json");
  }

  private async getProjectFilePath(id: string): Promise<string> {
    return join(await this.getProjectsDir(), `${id}.json`);
  }

  private async getProjectAssetDir(projectId: string): Promise<string> {
    const directory = join(await this.getProjectsDir(), `${projectId}-assets`);
    await mkdir(directory, { recursive: true });
    return directory;
  }

  private async listFoldersInternal(): Promise<ProjectFolder[]> {
    const filePath = await this.getFoldersFilePath();

    try {
      const raw = await readFile(filePath, "utf8");
      return (JSON.parse(raw) as ProjectFolder[]).map((folder) => normalizeFolder(folder));
    } catch {
      return [];
    }
  }

  private async saveFoldersInternal(folders: ProjectFolder[]): Promise<void> {
    const filePath = await this.getFoldersFilePath();
    const normalized = folders.map((folder) => normalizeFolder(folder));
    await writeFile(filePath, JSON.stringify(normalized, null, 2) + "\n", "utf8");
  }

  private async listProjectsInternal(): Promise<ProjectDraft[]> {
    const directory = await this.getProjectsDir();
    const filenames = await readdir(directory);
    const projects = await Promise.all(
      filenames
        .filter((filename) => filename.endsWith(".json"))
        .map(async (filename) => {
          const filePath = join(directory, filename);
          const raw = await readFile(filePath, "utf8");
          return normalizeProjectAssets(JSON.parse(raw) as ProjectDraft);
        })
    );

    return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  private toProjectSummary(
    project: ProjectDraft,
    folders: ProjectFolder[]
  ): ProjectSummary {
    const folder = folders.find((item) => item.id === project.folderId) ?? null;
    const lastCapturedAt =
      project.steps
        .map((step) => step.capturedAt)
        .filter((capturedAt): capturedAt is string => Boolean(capturedAt))
        .sort()
        .at(-1) ?? null;

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

  async getLibrary(): Promise<ProjectLibrary> {
    const [folders, projects] = await Promise.all([
      this.listFoldersInternal(),
      this.listProjectsInternal()
    ]);

    return {
      folders,
      guides: projects.map((project) => this.toProjectSummary(project, folders))
    };
  }

  async load(id: string): Promise<ProjectDraft | null> {
    const directory = await this.getProjectsDir();
    const filePath = join(directory, `${id}.json`);

    try {
      const raw = await readFile(filePath, "utf8");
      return normalizeProjectAssets(JSON.parse(raw) as ProjectDraft);
    } catch {
      return null;
    }
  }

  async createEmpty(input?: CreateProjectInput): Promise<ProjectDraft> {
    const now = new Date().toISOString();
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

  async save(input: SaveProjectInput): Promise<ProjectDraft> {
    const directory = await this.getProjectsDir();
    const project = normalizeProject({
      ...input.project,
      updatedAt: new Date().toISOString()
    });

    const filePath = join(directory, `${project.id}.json`);
    await writeFile(filePath, JSON.stringify(project, null, 2) + "\n", "utf8");
    return project;
  }

  async updateMeta(input: UpdateProjectMetaInput): Promise<ProjectDraft | null> {
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

  async duplicate(input: DuplicateProjectInput): Promise<ProjectDraft | null> {
    const project = await this.load(input.id);
    if (!project) {
      return null;
    }

    const now = new Date().toISOString();
    const duplicated = normalizeProject({
      ...JSON.parse(JSON.stringify(project)) as ProjectDraft,
      id: createId(),
      name: `${project.name} Copy`,
      createdAt: now,
      updatedAt: now
    });

    return this.save({ project: duplicated });
  }

  async deleteMany(input: DeleteProjectsInput): Promise<void> {
    await Promise.all(
      input.ids.map(async (id) => {
        const filePath = await this.getProjectFilePath(id);
        await rm(filePath, { force: true });
      })
    );
  }

  async moveMany(input: MoveProjectsInput): Promise<void> {
    const projects = await Promise.all(input.ids.map((id) => this.load(id)));
    await Promise.all(
      projects
        .filter((project): project is ProjectDraft => Boolean(project))
        .map((project) =>
          this.save({
            project: {
              ...project,
              folderId: input.folderId
            }
          })
        )
    );
  }

  async importImages(input: ImportProjectImagesInput): Promise<ImportProjectImagesResult | null> {
    const selectedPaths =
      input.filePaths?.filter(Boolean) ??
      (
        await dialog.showOpenDialog({
          title: "Import images as guide steps",
          properties: ["openFile", "multiSelections"],
          filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"] }]
        })
      ).filePaths;

    if (!selectedPaths.length) {
      return null;
    }

    const persistedProject = await this.save({
      project: input.project
    });
    const assetDirectory = await this.getProjectAssetDir(persistedProject.id);
    const now = new Date().toISOString();

    const importedSteps = await Promise.all(
      selectedPaths.map(async (sourcePath, index) => {
        const assetId = createId();
        const extension = extname(sourcePath) || ".png";
        const assetFilename = `${assetId}${extension}`;
        const assetPath = join(assetDirectory, assetFilename);
        await copyFile(sourcePath, assetPath);

        const metadata = await sharp(sourcePath).metadata().catch(() => null);
        const width = metadata?.width ?? 1440;
        const height = metadata?.height ?? 900;
        const stepNumber = persistedProject.steps.length + index + 1;

        const asset: StepAssetRef = {
          id: assetId,
          kind: "image",
          name: assetFilename,
          absolutePath: assetPath,
          fileUrl: pathToFileURL(assetPath).toString(),
          appUrl: toAssetAppUrl(assetPath),
          createdAt: now,
          width,
          height,
          displayLabel: basename(sourcePath)
        };

        return {
          id: createId(),
          stepNumber,
          clickIndex: null,
          title: `Step ${String(stepNumber).padStart(2, "0")}. Review ${basename(sourcePath, extension)}`,
          notes: `Imported from ${basename(sourcePath)}. Describe what the operator should do, verify, or learn from this screenshot.`,
          notesHtml: normalizeNotesHtml(
            null,
            `Imported from ${basename(sourcePath)}. Describe what the operator should do, verify, or learn from this screenshot.`
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
        } satisfies StepDraft;
      })
    );

    const nextProject = normalizeProject({
      ...persistedProject,
      updatedAt: now,
      steps: [...persistedProject.steps, ...importedSteps]
    });

    const filePath = await this.getProjectFilePath(nextProject.id);
    await writeFile(filePath, JSON.stringify(nextProject, null, 2) + "\n", "utf8");

    return {
      project: nextProject,
      importedSteps
    };
  }

  async importAnnotationAsset(input: ImportAnnotationAssetInput): Promise<ImportAnnotationAssetResult | null> {
    const persistedProject = await this.save({
      project: input.project
    });
    const stepIndex = persistedProject.steps.findIndex((step) => step.id === input.stepId);
    const step = persistedProject.steps[stepIndex];

    if (!step) {
      return null;
    }

    const selectedPaths = (
      await dialog.showOpenDialog({
        title: "Add image asset to annotation",
        properties: ["openFile"],
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"] }]
      })
    ).filePaths;

    const sourcePath = selectedPaths[0];
    if (!sourcePath) {
      return null;
    }

    const assetId = createId();
    const extension = extname(sourcePath) || ".png";
    const assetFilename = `${assetId}${extension}`;
    const assetDirectory = await this.getProjectAssetDir(persistedProject.id);
    const assetPath = join(assetDirectory, assetFilename);
    await copyFile(sourcePath, assetPath);

    const metadata = await sharp(sourcePath).metadata().catch(() => null);
    const width = metadata?.width ?? 640;
    const height = metadata?.height ?? 480;
    const now = new Date().toISOString();

    const asset = {
      id: assetId,
      kind: "image" as const,
      name: assetFilename,
      absolutePath: assetPath,
      fileUrl: pathToFileURL(assetPath).toString(),
      appUrl: toAssetAppUrl(assetPath),
      createdAt: now,
      width,
      height,
      displayLabel: basename(sourcePath)
    };

    const annotation: StepAnnotation = {
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
      annotations: [...(step.annotations ?? []), annotation]
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

  async cropStepAsset(input: CropStepAssetInput): Promise<CropStepAssetResult | null> {
    const persistedProject = await this.save({
      project: input.project
    });
    const stepIndex = persistedProject.steps.findIndex((step) => step.id === input.stepId);
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
    const croppedBuffer = await image
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .png()
      .toBuffer();

    const assetId = createId();
    const assetFilename = `${assetId}.png`;
    const assetDirectory = await this.getProjectAssetDir(persistedProject.id);
    const assetPath = join(assetDirectory, assetFilename);
    await writeFile(assetPath, croppedBuffer);

    const now = new Date().toISOString();
    const asset = {
      id: assetId,
      kind: "image" as const,
      name: assetFilename,
      absolutePath: assetPath,
      fileUrl: pathToFileURL(assetPath).toString(),
      appUrl: toAssetAppUrl(assetPath),
      createdAt: now,
      width: cropWidth,
      height: cropHeight,
      displayLabel: `${step.asset.displayLabel} (cropped)`
    };

    const nextStep: StepDraft = {
      ...step,
      asset,
      cropRestoreState: {
        asset: step.asset,
        annotations: normalizeStepAnnotations(step.annotations),
        capturedAt: step.capturedAt ?? null
      },
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

  async restoreStepAsset(input: import("@shared/contracts").RestoreStepAssetInput): Promise<import("@shared/contracts").RestoreStepAssetResult | null> {
    const persistedProject = await this.save({
      project: input.project
    });
    const stepIndex = persistedProject.steps.findIndex((step) => step.id === input.stepId);
    const step = persistedProject.steps[stepIndex];

    if (!step?.cropRestoreState?.asset) {
      return null;
    }

    const now = new Date().toISOString();
    const restoreState = step.cropRestoreState;
    const nextStep: StepDraft = {
      ...step,
      asset: restoreState.asset,
      annotations: normalizeStepAnnotations(restoreState.annotations),
      cropRestoreState: null,
      capturedAt: restoreState.capturedAt ?? step.capturedAt ?? now
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
      asset: nextProject.steps[stepIndex]?.asset ?? restoreState.asset
    };
  }

  async createFolder(input: CreateFolderInput): Promise<ProjectFolder> {
    const now = new Date().toISOString();
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

  async renameFolder(input: RenameFolderInput): Promise<ProjectFolder | null> {
    const folders = await this.listFoldersInternal();
    const target = folders.find((folder) => folder.id === input.id);
    if (!target) {
      return null;
    }

    target.name = input.name.trim() || target.name;
    target.updatedAt = new Date().toISOString();
    await this.saveFoldersInternal(folders);
    return target;
  }

  async deleteFolder(input: DeleteFolderInput): Promise<void> {
    const folders = await this.listFoldersInternal();
    await this.saveFoldersInternal(folders.filter((folder) => folder.id !== input.id));
    const projects = await this.listProjectsInternal();
    await Promise.all(
      projects
        .filter((project) => project.folderId === input.id)
        .map((project) =>
          this.save({
            project: {
              ...project,
              folderId: null
            }
          })
        )
    );
  }

  async addCapturedStep(input: {
    project: ProjectDraft;
    screenshot: Buffer;
    title?: string;
    notes?: string;
    width: number;
    height: number;
    displayLabel: string;
    clickIndex?: number | null;
    appName?: string | null;
    windowTitle?: string | null;
    contextLabel?: string | null;
  }): Promise<{
    project: ProjectDraft;
    capturedStep: StepDraft;
    asset: StepAssetRef;
  }> {
    const now = new Date().toISOString();
    const persistedProject = await this.save({
      project: input.project
    });

    const assetId = createId();
    const assetFilename = `${assetId}.png`;
    const assetDirectory = await this.getProjectAssetDir(persistedProject.id);
    const assetPath = join(assetDirectory, assetFilename);

    await writeFile(assetPath, input.screenshot);

    const asset: StepAssetRef = {
      id: assetId,
      kind: "image",
      name: assetFilename,
      absolutePath: assetPath,
      fileUrl: pathToFileURL(assetPath).toString(),
      appUrl: toAssetAppUrl(assetPath),
      createdAt: now,
      width: input.width,
      height: input.height,
      displayLabel: input.displayLabel
    };

    const capturedStep: StepDraft = {
      id: createId(),
      stepNumber: persistedProject.steps.length + 1,
      clickIndex: input.clickIndex ?? null,
      title: input.title?.trim() || `Captured step ${persistedProject.steps.length + 1}`,
      notes:
        input.notes?.trim() ||
        `Screenshot captured from ${input.displayLabel}. Add operator guidance, expected outcome, and edge cases here.`,
      notesHtml: normalizeNotesHtml(
        null,
        input.notes?.trim() ||
          `Screenshot captured from ${input.displayLabel}. Add operator guidance, expected outcome, and edge cases here.`
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
    await writeFile(filePath, JSON.stringify(nextProject, null, 2) + "\n", "utf8");

    return {
      project: nextProject,
      capturedStep,
      asset
    };
  }
}
