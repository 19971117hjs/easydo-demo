import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type {
  AppOverview,
  CaptureState,
  CaptureStepResult,
  ClickStreamProgress,
  ClickStreamStatus,
  ExportHtmlResult,
  OcrLanguageOption,
  OcrRecognitionResult,
  PermissionSnapshot,
  ProjectDraft,
  ProjectFolder,
  ProjectLibrary,
  ProjectSummary,
  ProjectThemeTone,
  StepAnnotation,
  StepDraft,
  StepTextBlock
} from "@shared/contracts";
import { resolveAssetUrl } from "@renderer/utils/asset-url";
import { normalizeStepAnnotations } from "@shared/step-annotations";
import { htmlToPlainText, normalizeNotesHtml } from "@shared/step-content";

type GuideSortMode =
  | "updated-desc"
  | "updated-asc"
  | "created-desc"
  | "created-asc"
  | "name-asc"
  | "name-desc"
  | "steps-desc";

type GuideFilterScope = "all" | "favorites" | "ungrouped" | string;

function createStep(kind: StepDraft["kind"] = "action"): StepDraft {
  const defaults: Record<StepDraft["kind"], Pick<StepDraft, "title" | "notes">> = {
    action: {
      title: "New action step",
      notes: "Describe what to click, what to verify, and what should happen next."
    },
    note: {
      title: "Important note",
      notes: "Call out warnings, decision rules, QA checks, or exceptions here."
    },
    section: {
      title: "New section",
      notes: "Use a section to group the next steps into a meaningful phase."
    },
    content: {
      title: "Content block",
      notes: "Add context, explanation, or supporting information between screenshots."
    }
  };

  const isContent = kind === "content" || kind === "note";

  return {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: defaults[kind].title,
    notes: defaults[kind].notes,
    notesHtml: normalizeNotesHtml(null, defaults[kind].notes),
    kind,
    status: "default",
    stepNumber: null,
    clickIndex: null,
    appName: null,
    windowTitle: null,
    contextLabel: null,
    annotations: [],
    textBlocks: [],
    settings: {
      forceNewPage: false,
      isContentBlock: isContent,
      isMultiCaptureStep: false,
      includeSubstepTitles: true,
      showStepNumber: !isContent
    }
  };
}

function toPlainProject(project: ProjectDraft): ProjectDraft {
  return JSON.parse(JSON.stringify(project)) as ProjectDraft;
}

function normalizeTextBlock(block: StepTextBlock): StepTextBlock {
  return {
    ...block,
    contentHtml: normalizeNotesHtml(block.contentHtml, block.content),
    content: htmlToPlainText(block.contentHtml ?? block.content) || block.content,
    collapsed: block.collapsed ?? false
  };
}

function normalizeProject(project: ProjectDraft): ProjectDraft {
  return {
    ...project,
    folderId: project.folderId ?? null,
    isFavorited: project.isFavorited ?? false,
    steps: project.steps.map((step) => ({
      ...step,
      notesHtml: normalizeNotesHtml(step.notesHtml, step.notes),
      notes: htmlToPlainText(step.notesHtml ?? step.notes) || step.notes,
      status: step.status ?? "default",
      annotations: normalizeStepAnnotations(step.annotations).map((annotation) => ({
        ...annotation,
        asset: annotation.asset
          ? {
              ...annotation.asset,
              appUrl: resolveAssetUrl(annotation.asset)
            }
          : annotation.asset
      })),
      textBlocks: (step.textBlocks ?? []).map((block) => normalizeTextBlock(block)),
      settings: {
        forceNewPage: false,
        isContentBlock: step.kind === "content" || step.kind === "note",
        isMultiCaptureStep: false,
        includeSubstepTitles: true,
        showStepNumber: step.kind !== "content",
        ...(step.settings ?? {})
      },
      asset: step.asset
        ? {
            ...step.asset,
            appUrl: resolveAssetUrl(step.asset)
          }
        : step.asset
    }))
  };
}

function normalizeCaptureResult(result: CaptureStepResult): CaptureStepResult {
  return {
    ...result,
    asset: {
      ...result.asset,
      appUrl: resolveAssetUrl(result.asset)
    },
    project: normalizeProject(result.project),
    capturedStep: {
      ...result.capturedStep,
      asset: result.capturedStep.asset
        ? {
            ...result.capturedStep.asset,
            appUrl: resolveAssetUrl(result.capturedStep.asset)
          }
        : result.capturedStep.asset
    }
  };
}

function normalizeLibrary(library: ProjectLibrary): ProjectLibrary {
  return {
    folders: [...library.folders].sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
    guides: [...library.guides].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  };
}

function renumberSteps(project: ProjectDraft): ProjectDraft {
  return {
    ...project,
    steps: project.steps.map((step, index) => ({
      ...step,
      stepNumber: index + 1
    }))
  };
}

function sortGuides(guides: ProjectSummary[], mode: GuideSortMode): ProjectSummary[] {
  const sorted = [...guides];
  sorted.sort((left, right) => {
    if (mode === "updated-asc") {
      return left.updatedAt.localeCompare(right.updatedAt);
    }
    if (mode === "created-desc") {
      return right.createdAt.localeCompare(left.createdAt);
    }
    if (mode === "created-asc") {
      return left.createdAt.localeCompare(right.createdAt);
    }
    if (mode === "name-asc") {
      return left.name.localeCompare(right.name, "zh-CN");
    }
    if (mode === "name-desc") {
      return right.name.localeCompare(left.name, "zh-CN");
    }
    if (mode === "steps-desc") {
      return right.stepCount - left.stepCount || right.updatedAt.localeCompare(left.updatedAt);
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
  return sorted;
}

export const useWorkbenchStore = defineStore("workbench", () => {
  const bootstrapTask = ref<Promise<void> | null>(null);
  const appOverview = ref<AppOverview | null>(null);
  const captureState = ref<CaptureState | null>(null);
  const permissionSnapshot = ref<PermissionSnapshot | null>(null);
  const projects = ref<ProjectSummary[]>([]);
  const folders = ref<ProjectFolder[]>([]);
  const currentProject = ref<ProjectDraft | null>(null);
  const saveMessage = ref("Draft not saved yet");
  const lastCaptureResult = ref<CaptureStepResult | null>(null);
  const lastExportResult = ref<ExportHtmlResult | null>(null);
  const isExporting = ref(false);
  const previewHtml = ref("");
  const clickStreamStatus = ref<ClickStreamStatus>("idle");
  const clickStreamError = ref("");
  const clickStreamProgress = ref<ClickStreamProgress>({
    acceptedCount: 0,
    queuedCount: 0,
    completedCount: 0,
    lastEventAt: null
  });
  const ocrEnabled = ref(false);
  const ocrBusy = ref(false);
  const ocrLanguageOptions = ref<OcrLanguageOption[]>([]);
  const ocrLanguage = ref("eng+chi_sim");
  const ocrResult = ref<OcrRecognitionResult | null>(null);
  const ocrError = ref("");
  const activeGuideScope = ref<GuideFilterScope>("all");
  const guideSearch = ref("");
  const guideSortMode = ref<GuideSortMode>("updated-desc");
  const selectedGuideIds = ref<string[]>([]);

  const projectStepCount = computed(() => currentProject.value?.steps.length ?? 0);
  const folderMap = computed(() => new Map(folders.value.map((folder) => [folder.id, folder])));
  const favoriteProjects = computed(() =>
    sortGuides(
      projects.value.filter((guide) => guide.isFavorited),
      "updated-desc"
    ).slice(0, 6)
  );
  const visibleProjects = computed(() => {
    const searchTerm = guideSearch.value.trim().toLowerCase();
    const scoped = projects.value.filter((guide) => {
      if (activeGuideScope.value === "favorites" && !guide.isFavorited) {
        return false;
      }
      if (activeGuideScope.value === "ungrouped" && guide.folderId) {
        return false;
      }
      if (
        activeGuideScope.value !== "all" &&
        activeGuideScope.value !== "favorites" &&
        activeGuideScope.value !== "ungrouped" &&
        guide.folderId !== activeGuideScope.value
      ) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return [guide.name, guide.description, guide.folderName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm);
    });

    return sortGuides(scoped, guideSortMode.value);
  });
  const selectedVisibleGuideIds = computed(() =>
    visibleProjects.value
      .map((guide) => guide.id)
      .filter((id) => selectedGuideIds.value.includes(id))
  );
  const selectedGuideCount = computed(() => selectedGuideIds.value.length);

  async function refreshLibrary(): Promise<void> {
    const library = normalizeLibrary(await window.easydo.projects.getLibrary());
    projects.value = library.guides;
    folders.value = library.folders;
    selectedGuideIds.value = selectedGuideIds.value.filter((id) =>
      library.guides.some((guide) => guide.id === id)
    );
  }

  async function ensureOcrLanguages(): Promise<void> {
    if (ocrLanguageOptions.value.length > 0) {
      return;
    }

    ocrLanguageOptions.value = await window.easydo.projects.getOcrLanguages();
    if (!ocrLanguageOptions.value.some((option) => option.code === ocrLanguage.value)) {
      ocrLanguage.value = ocrLanguageOptions.value[0]?.code ?? "eng";
    }
  }

  async function bootstrap(): Promise<void> {
    if (bootstrapTask.value) {
      await bootstrapTask.value;
      return;
    }

    bootstrapTask.value = (async () => {
      const [overview, capture, permissions] = await Promise.all([
        window.easydo.app.getOverview(),
        window.easydo.capture.getState(),
        window.easydo.capture.getPermissions()
      ]);

      appOverview.value = overview;
      captureState.value = capture;
      permissionSnapshot.value = permissions;
      await ensureOcrLanguages();
      await refreshLibrary();

      if (!currentProject.value) {
        currentProject.value = normalizeProject(await window.easydo.projects.createEmpty());
      }
    })();

    try {
      await bootstrapTask.value;
    } finally {
      bootstrapTask.value = null;
    }
  }

  function listenCaptureState(): () => void {
    return window.easydo.capture.onStateChanged((state) => {
      captureState.value = state;
    });
  }

  function listenAutoStepCreated(): () => void {
    return window.easydo.capture.onAutoStepCreated((result) => {
      const normalized = normalizeCaptureResult(result);
      currentProject.value = normalized.project;
      captureState.value = normalized.captureState;
      permissionSnapshot.value = normalized.permissions;
      lastCaptureResult.value = normalized;
      void refreshLibrary();
      saveMessage.value = `Auto-captured ${normalized.capturedStep.title}`;
    });
  }

  function listenClickStreamStatus(): () => void {
    return window.easydo.capture.onClickStreamStatus((status) => {
      clickStreamStatus.value = status;
    });
  }

  function listenClickStreamError(): () => void {
    return window.easydo.capture.onClickStreamError((message) => {
      clickStreamError.value = message;
      saveMessage.value = message;
    });
  }

  function listenClickStreamProgress(): () => void {
    return window.easydo.capture.onClickStreamProgress((progress) => {
      clickStreamProgress.value = progress;
    });
  }

  async function createProject(input?: {
    name?: string;
    folderId?: string | null;
    persist?: boolean;
  }): Promise<ProjectDraft> {
    const draft = normalizeProject(
      await window.easydo.projects.createEmpty({
        name: input?.name,
        folderId: input?.folderId ?? null
      })
    );

    currentProject.value = input?.persist ? normalizeProject(await window.easydo.projects.save({ project: draft })) : draft;
    if (input?.persist) {
      await refreshLibrary();
    }
    saveMessage.value = "New guide ready for editing";
    return currentProject.value;
  }

  async function refreshPermissions(): Promise<void> {
    permissionSnapshot.value = await window.easydo.capture.getPermissions();
  }

  async function loadProject(id: string): Promise<void> {
    const project = await window.easydo.projects.load(id);
    if (project) {
      currentProject.value = normalizeProject(project);
      saveMessage.value = "Existing guide loaded";
    }
  }

  function updateProjectMeta(
    patch: Partial<Pick<ProjectDraft, "name" | "description" | "folderId" | "isFavorited">>
  ): void {
    if (!currentProject.value) {
      return;
    }

    currentProject.value = {
      ...currentProject.value,
      ...patch
    };
  }

  function updateProjectCover(patch: Partial<ProjectDraft["cover"]>): void {
    if (!currentProject.value) {
      return;
    }

    currentProject.value = {
      ...currentProject.value,
      cover: {
        ...currentProject.value.cover,
        ...patch
      }
    };
  }

  function updateProjectTheme(tone: ProjectThemeTone): void {
    if (!currentProject.value) {
      return;
    }

    currentProject.value = {
      ...currentProject.value,
      theme: {
        ...currentProject.value.theme,
        tone
      }
    };
  }

  function addStep(kind: StepDraft["kind"] = "action"): string | null {
    if (!currentProject.value) {
      return null;
    }

    const createdStep = createStep(kind);
    currentProject.value = renumberSteps({
      ...currentProject.value,
      steps: [...currentProject.value.steps, createdStep]
    });
    return createdStep.id;
  }

  function insertStep(atIndex: number, kind: StepDraft["kind"] = "action"): string | null {
    if (!currentProject.value) {
      return null;
    }

    const nextSteps = [...currentProject.value.steps];
    const createdStep = createStep(kind);
    nextSteps.splice(atIndex, 0, createdStep);
    currentProject.value = renumberSteps({
      ...currentProject.value,
      steps: nextSteps
    });
    return createdStep.id;
  }

  function removeStep(id: string): void {
    if (!currentProject.value) {
      return;
    }

    currentProject.value = renumberSteps({
      ...currentProject.value,
      steps: currentProject.value.steps.filter((step) => step.id !== id)
    });
  }

  function duplicateStep(id: string): string | null {
    if (!currentProject.value) {
      return null;
    }

    const stepIndex = currentProject.value.steps.findIndex((step) => step.id === id);
    if (stepIndex === -1) {
      return null;
    }

    const source = currentProject.value.steps[stepIndex];
    const duplicate: StepDraft = {
      ...JSON.parse(JSON.stringify(source)) as StepDraft,
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      clickIndex: null,
      capturedAt: null
    };
    const nextSteps = [...currentProject.value.steps];
    nextSteps.splice(stepIndex + 1, 0, duplicate);
    currentProject.value = renumberSteps({
      ...currentProject.value,
      steps: nextSteps
    });
    return duplicate.id;
  }

  function moveStep(fromIndex: number, toIndex: number): void {
    if (!currentProject.value || fromIndex === toIndex) {
      return;
    }

    const nextSteps = [...currentProject.value.steps];
    const [moved] = nextSteps.splice(fromIndex, 1);
    if (!moved) {
      return;
    }

    nextSteps.splice(toIndex, 0, moved);
    currentProject.value = renumberSteps({
      ...currentProject.value,
      steps: nextSteps
    });
  }

  function updateStep(id: string, patch: Partial<StepDraft>): void {
    if (!currentProject.value) {
      return;
    }

    currentProject.value = {
      ...currentProject.value,
      steps: currentProject.value.steps.map((step) => {
        if (step.id !== id) {
          return step;
        }

        const nextStep = { ...step, ...patch };
        if (typeof patch.notesHtml === "string") {
          nextStep.notesHtml = patch.notesHtml;
          nextStep.notes = htmlToPlainText(patch.notesHtml);
        } else if (typeof patch.notes === "string") {
          nextStep.notes = patch.notes;
          nextStep.notesHtml = normalizeNotesHtml(nextStep.notesHtml, patch.notes);
        }
        if ("annotations" in patch) {
          nextStep.annotations = normalizeStepAnnotations(patch.annotations);
        } else if (!nextStep.annotations) {
          nextStep.annotations = [];
        }
        if ("textBlocks" in patch) {
          nextStep.textBlocks = (patch.textBlocks ?? []).map((block) => normalizeTextBlock(block));
        } else if (!nextStep.textBlocks) {
          nextStep.textBlocks = [];
        }
        nextStep.status = nextStep.status ?? "default";
        nextStep.settings = {
          forceNewPage: false,
          isContentBlock: nextStep.kind === "content" || nextStep.kind === "note",
          isMultiCaptureStep: false,
          includeSubstepTitles: true,
          showStepNumber: nextStep.kind !== "content",
          ...(nextStep.settings ?? {})
        };
        return nextStep;
      })
    };
  }

  async function saveProject(): Promise<void> {
    if (!currentProject.value) {
      return;
    }

    currentProject.value = normalizeProject(
      await window.easydo.projects.save({
        project: toPlainProject(currentProject.value)
      })
    );
    await refreshLibrary();
    saveMessage.value = `Saved at ${new Date(currentProject.value.updatedAt).toLocaleString()}`;
  }

  async function renameProject(id: string, name: string): Promise<void> {
    const project = await window.easydo.projects.updateMeta({
      id,
      patch: { name }
    });
    if (project && currentProject.value?.id === id) {
      currentProject.value = normalizeProject(project);
    }
    await refreshLibrary();
    saveMessage.value = "Guide renamed";
  }

  async function toggleProjectFavorite(id: string): Promise<void> {
    const summary = projects.value.find((guide) => guide.id === id);
    if (!summary) {
      return;
    }

    const project = await window.easydo.projects.updateMeta({
      id,
      patch: { isFavorited: !summary.isFavorited }
    });
    if (project && currentProject.value?.id === id) {
      currentProject.value = normalizeProject(project);
    }
    await refreshLibrary();
    saveMessage.value = project?.isFavorited ? "Guide added to favorites" : "Guide removed from favorites";
  }

  async function duplicateProject(id: string): Promise<ProjectDraft | null> {
    const duplicated = await window.easydo.projects.duplicate({ id });
    await refreshLibrary();
    if (!duplicated) {
      return null;
    }
    saveMessage.value = "Guide duplicated";
    return duplicated;
  }

  async function deleteProjects(ids: string[]): Promise<void> {
    if (!ids.length) {
      return;
    }

    await window.easydo.projects.deleteMany({ ids });
    if (currentProject.value && ids.includes(currentProject.value.id)) {
      currentProject.value = null;
    }
    selectedGuideIds.value = selectedGuideIds.value.filter((id) => !ids.includes(id));
    await refreshLibrary();
    saveMessage.value = ids.length === 1 ? "Guide deleted" : `${ids.length} guides deleted`;
  }

  async function moveProjectsToFolder(ids: string[], folderId: string | null): Promise<void> {
    if (!ids.length) {
      return;
    }

    await window.easydo.projects.moveMany({ ids, folderId });
    if (currentProject.value && ids.includes(currentProject.value.id)) {
      currentProject.value = {
        ...currentProject.value,
        folderId
      };
    }
    await refreshLibrary();
    saveMessage.value = folderId
      ? `Moved ${ids.length} guide${ids.length > 1 ? "s" : ""} to ${folderMap.value.get(folderId)?.name ?? "folder"}`
      : `Removed ${ids.length} guide${ids.length > 1 ? "s" : ""} from folder`;
  }

  async function importImagesAsSteps(filePaths?: string[]): Promise<StepDraft[]> {
    if (!currentProject.value) {
      currentProject.value = normalizeProject(await window.easydo.projects.createEmpty());
    }

    const result = await window.easydo.projects.importImages({
      project: toPlainProject(currentProject.value),
      filePaths: filePaths ?? null
    });

    if (!result) {
      saveMessage.value = "Image import canceled";
      return [];
    }

    currentProject.value = normalizeProject(result.project);
    await refreshLibrary();
    saveMessage.value =
      result.importedSteps.length === 1
        ? `Imported ${result.importedSteps[0]?.title ?? "1 image"}`
        : `Imported ${result.importedSteps.length} images as steps`;
    return result.importedSteps;
  }

  async function importAnnotationAsset(stepId: string): Promise<StepAnnotation | null> {
    if (!currentProject.value) {
      return null;
    }

    const result = await window.easydo.projects.importAnnotationAsset({
      project: toPlainProject(currentProject.value),
      stepId
    });

    if (!result) {
      saveMessage.value = "Asset import canceled";
      return null;
    }

    currentProject.value = normalizeProject(result.project);
    await refreshLibrary();
    saveMessage.value = `Added asset ${result.asset.displayLabel}`;
    return result.annotation;
  }

  async function cropStepAsset(stepId: string, selection: { x: number; y: number; width: number; height: number }): Promise<void> {
    if (!currentProject.value) {
      return;
    }

    const result = await window.easydo.projects.cropStepAsset({
      project: toPlainProject(currentProject.value),
      stepId,
      selection
    });

    if (!result) {
      saveMessage.value = "Crop canceled";
      return;
    }

    currentProject.value = normalizeProject(result.project);
    await refreshLibrary();
    saveMessage.value = `Cropped ${result.asset.displayLabel}`;
  }

  async function recognizeStepText(
    stepId: string,
    selection?: { x: number; y: number; width: number; height: number } | null
  ): Promise<OcrRecognitionResult | null> {
    if (!currentProject.value) {
      return null;
    }

    await ensureOcrLanguages();
    ocrBusy.value = true;
    ocrError.value = "";

    try {
      const result = await window.easydo.projects.recognizeStepText({
        project: toPlainProject(currentProject.value),
        stepId,
        language: ocrLanguage.value,
        selection: selection ?? null
      });

      if (!result) {
        saveMessage.value = "OCR could not read this step";
        return null;
      }

      ocrResult.value = result;
      if (result.text) {
        await window.easydo.app.writeClipboardText(result.text);
        saveMessage.value = `OCR extracted ${result.lines.length || 1} line${result.lines.length === 1 ? "" : "s"} and copied the result`;
      } else {
        saveMessage.value = "OCR completed but no text was detected";
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ocrError.value = message;
      saveMessage.value = `OCR failed: ${message}`;
      return null;
    } finally {
      ocrBusy.value = false;
    }
  }

  async function copyOcrResult(): Promise<void> {
    if (!ocrResult.value?.text) {
      return;
    }

    await window.easydo.app.writeClipboardText(ocrResult.value.text);
    saveMessage.value = "OCR result copied";
  }

  function toggleOcr(force?: boolean): void {
    ocrEnabled.value = typeof force === "boolean" ? force : !ocrEnabled.value;
    if (ocrEnabled.value) {
      void ensureOcrLanguages();
      return;
    }

    ocrError.value = "";
  }

  function setOcrLanguage(language: string): void {
    ocrLanguage.value = language;
  }

  async function createFolder(name: string): Promise<ProjectFolder | null> {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }

    const folder = await window.easydo.projects.createFolder({ name: trimmed });
    await refreshLibrary();
    saveMessage.value = `Folder ${folder.name} created`;
    return folder;
  }

  async function renameFolder(id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    await window.easydo.projects.renameFolder({ id, name: trimmed });
    await refreshLibrary();
    saveMessage.value = "Folder renamed";
  }

  async function deleteFolder(id: string): Promise<void> {
    await window.easydo.projects.deleteFolder({ id });
    if (activeGuideScope.value === id) {
      activeGuideScope.value = "all";
    }
    await refreshLibrary();
    saveMessage.value = "Folder deleted";
  }

  function setActiveGuideScope(scope: GuideFilterScope): void {
    activeGuideScope.value = scope;
    selectedGuideIds.value = [];
  }

  function setGuideSearch(value: string): void {
    guideSearch.value = value;
  }

  function setGuideSortMode(mode: GuideSortMode): void {
    guideSortMode.value = mode;
  }

  function toggleGuideSelection(id: string): void {
    if (selectedGuideIds.value.includes(id)) {
      selectedGuideIds.value = selectedGuideIds.value.filter((item) => item !== id);
      return;
    }
    selectedGuideIds.value = [...selectedGuideIds.value, id];
  }

  function clearGuideSelection(): void {
    selectedGuideIds.value = [];
  }

  function selectAllVisibleGuides(): void {
    selectedGuideIds.value = visibleProjects.value.map((guide) => guide.id);
  }

  async function exportProjectHtml(): Promise<void> {
    if (!currentProject.value) {
      return;
    }

    isExporting.value = true;

    try {
      currentProject.value = normalizeProject(
        await window.easydo.projects.save({
          project: toPlainProject(currentProject.value)
        })
      );
      const result = await window.easydo.exports.exportHtml({
        project: toPlainProject(currentProject.value)
      });
      lastExportResult.value = result;
      saveMessage.value = `Exported HTML to ${result.absolutePath}`;
      await refreshLibrary();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      saveMessage.value =
        message === "HTML export was canceled." ? "HTML export canceled" : message;
    } finally {
      isExporting.value = false;
    }
  }

  async function openExportedHtml(): Promise<void> {
    if (!lastExportResult.value) {
      return;
    }

    await window.easydo.exports.openPath(lastExportResult.value.absolutePath);
  }

  async function refreshPreviewHtml(): Promise<void> {
    if (!currentProject.value) {
      previewHtml.value = "";
      return;
    }

    previewHtml.value = await window.easydo.exports.previewHtml({
      project: toPlainProject(currentProject.value)
    });
  }

  async function prepareCapture(mode: CaptureState["mode"] = "guide"): Promise<void> {
    captureState.value = await window.easydo.capture.prepare(mode);
  }

  async function startCapture(mode: CaptureState["mode"] = "guide"): Promise<void> {
    captureState.value = await window.easydo.capture.start(mode);
  }

  async function pauseCapture(): Promise<void> {
    captureState.value = await window.easydo.capture.pause();
  }

  async function stopCapture(): Promise<void> {
    captureState.value = await window.easydo.capture.stop();
  }

  async function captureCurrentStep(title?: string, notes?: string): Promise<void> {
    if (!currentProject.value) {
      currentProject.value = normalizeProject(await window.easydo.projects.createEmpty());
    }

    const result = normalizeCaptureResult(
      await window.easydo.capture.captureStep({
        project: toPlainProject(currentProject.value),
        title,
        notes
      })
    );

    currentProject.value = result.project;
    captureState.value = result.captureState;
    permissionSnapshot.value = result.permissions;
    lastCaptureResult.value = result;
    await refreshLibrary();
    saveMessage.value = `Captured ${result.capturedStep.title}`;
  }

  async function beginAreaSelection(title?: string, notes?: string): Promise<void> {
    if (!currentProject.value) {
      currentProject.value = normalizeProject(await window.easydo.projects.createEmpty());
    }

    const result = await window.easydo.capture.beginAreaSelection({
      project: toPlainProject(currentProject.value),
      title,
      notes
    });

    if (!result) {
      saveMessage.value = "Area selection canceled";
      return;
    }

    const normalized = normalizeCaptureResult(result);
    currentProject.value = normalized.project;
    captureState.value = normalized.captureState;
    permissionSnapshot.value = normalized.permissions;
    lastCaptureResult.value = normalized;
    await refreshLibrary();
    saveMessage.value = `Captured ${normalized.capturedStep.title}`;
  }

  async function startClickStream(title?: string, notes?: string): Promise<void> {
    if (!currentProject.value) {
      currentProject.value = normalizeProject(await window.easydo.projects.createEmpty());
    }

    clickStreamError.value = "";
    clickStreamProgress.value = {
      acceptedCount: 0,
      queuedCount: 0,
      completedCount: 0,
      lastEventAt: null
    };
    captureState.value = await window.easydo.capture.startClickStream({
      project: toPlainProject(currentProject.value),
      title,
      notes
    });
    clickStreamStatus.value = "handoff";
    saveMessage.value = "Choose the screen where easyDo should continue click capture.";
  }

  async function stopClickStream(): Promise<void> {
    captureState.value = await window.easydo.capture.stopClickStream();
    await refreshLibrary();
    saveMessage.value =
      clickStreamProgress.value.queuedCount > 0
        ? "Click stream is finishing queued captures..."
        : "Click stream stopped";
  }

  return {
    appOverview,
    captureState,
    permissionSnapshot,
    projects,
    folders,
    currentProject,
    projectStepCount,
    saveMessage,
    lastCaptureResult,
    lastExportResult,
    isExporting,
    previewHtml,
    clickStreamStatus,
    clickStreamError,
    clickStreamProgress,
    ocrEnabled,
    ocrBusy,
    ocrLanguageOptions,
    ocrLanguage,
    ocrResult,
    ocrError,
    activeGuideScope,
    guideSearch,
    guideSortMode,
    selectedGuideIds,
    selectedGuideCount,
    favoriteProjects,
    visibleProjects,
    selectedVisibleGuideIds,
    bootstrap,
    refreshLibrary,
    listenCaptureState,
    listenAutoStepCreated,
    listenClickStreamStatus,
    listenClickStreamError,
    listenClickStreamProgress,
    createProject,
    refreshPermissions,
    loadProject,
    updateProjectMeta,
    updateProjectCover,
    updateProjectTheme,
    addStep,
    insertStep,
    removeStep,
    duplicateStep,
    moveStep,
    updateStep,
    saveProject,
    renameProject,
    toggleProjectFavorite,
    duplicateProject,
    deleteProjects,
    moveProjectsToFolder,
    importImagesAsSteps,
    importAnnotationAsset,
    cropStepAsset,
    recognizeStepText,
    copyOcrResult,
    toggleOcr,
    setOcrLanguage,
    createFolder,
    renameFolder,
    deleteFolder,
    setActiveGuideScope,
    setGuideSearch,
    setGuideSortMode,
    toggleGuideSelection,
    clearGuideSelection,
    selectAllVisibleGuides,
    exportProjectHtml,
    openExportedHtml,
    refreshPreviewHtml,
    prepareCapture,
    startCapture,
    pauseCapture,
    stopCapture,
    captureCurrentStep,
    beginAreaSelection,
    startClickStream,
    stopClickStream
  };
});
