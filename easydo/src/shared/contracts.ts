export type CaptureStatus = "idle" | "preparing" | "recording" | "paused" | "stopped";
export type PermissionState = "granted" | "denied" | "unsupported";

export interface AppOverview {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  userDataPath: string;
  isPackaged: boolean;
  runtimeIdentity: string;
  execPath: string;
  appPath: string;
}

export interface EditorUiPrefs {
  appUiEditorLeftSidebarWidth: number;
  appUiEditorRightSidebarWidth: number;
  appUiEditorLeftSidebarOpened: boolean;
  appUiEditorRightSidebarOpened: boolean;
  appSettingFocusedViewForNewGuides: boolean;
  appUiStepsListGridView: boolean;
}

export interface PermissionSnapshot {
  accessibility: PermissionState;
  screenRecording: PermissionState;
  canCaptureScreens: boolean;
  checkedAt: string;
  notes: string[];
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClickCaptureEvent {
  index: number;
  button: string;
  clicks: number;
  screenX: number;
  screenY: number;
  regionLabel: string;
  displayLabel: string;
  capturedAt: string;
}

export type ClickStreamStatus =
  | "idle"
  | "handoff"
  | "setup"
  | "paused"
  | "armed"
  | "warming-up"
  | "queued"
  | "draining"
  | "debounced"
  | "ignored-main-window"
  | "ignored-control-window"
  | "capturing"
  | "stopped";

export interface ClickStreamProgress {
  acceptedCount: number;
  queuedCount: number;
  completedCount: number;
  lastEventAt: string | null;
}

export type CaptureTargetMode = "selected-region" | "full-screen" | "active-window";
export type CaptureStudioPhase = "setup" | "recording" | "paused";

export interface CaptureStudioLatestStep {
  stepId: string;
  stepNumber: number;
  title: string;
  notes: string;
  assetAppUrl: string;
}

export interface CaptureStudioPayload {
  phase: CaptureStudioPhase;
  displayLabel: string;
  displayBounds: {
    width: number;
    height: number;
  };
  captureMode: CaptureTargetMode;
  selectedRegion: SelectionRect | null;
  activeWindowBounds: SelectionRect | null;
  activeWindowLabel: string | null;
  cropperVisible: boolean;
  hideDuringCapture: boolean;
  stepCount: number;
  latestStep: CaptureStudioLatestStep | null;
}

export interface UpdateCaptureStudioLatestStepInput {
  title?: string;
  notes?: string;
}

export interface CaptureControlsLayout {
  width: number;
  height: number;
}

export interface CaptureOverlayPayload {
  mode: "area-selection" | "click-stream-handoff" | "click-stream-studio";
  displayLabel: string;
  displayBounds: {
    width: number;
    height: number;
  };
  imageDataUrl?: string;
  imageSize?: {
    width: number;
    height: number;
  };
  suggestedTitle?: string;
  suggestedNotes?: string;
  headline?: string;
  description?: string;
  confirmLabel?: string;
  studio?: CaptureStudioPayload;
}

export interface StepAssetRef {
  id: string;
  kind: "image";
  name: string;
  absolutePath: string;
  fileUrl: string;
  appUrl: string;
  createdAt: string;
  width: number;
  height: number;
  displayLabel: string;
}

export interface CaptureState {
  status: CaptureStatus;
  mode: "guide" | "screenshot";
  startedAt: string | null;
  lastStoppedAt: string | null;
}

export type StepStatus = "default" | "completed" | "skipped" | "hidden";
export type StepAnnotationType =
  | "click"
  | "rect"
  | "ellipse"
  | "line"
  | "brush"
  | "arrow"
  | "text"
  | "blur"
  | "highlight"
  | "magnify"
  | "cursor"
  | "asset"
  | "tooltip";

export type AnnotationCursorVariant = "pointer" | "text" | "hand";
export type AnnotationTextAlign = "left" | "center" | "right";
export type AnnotationTooltipPlacement = "top" | "bottom" | "left" | "right";
export type AnnotationLineStyle = "solid" | "dashed";

export interface StepAnnotation {
  id: string;
  type: StepAnnotationType;
  x: number;
  y: number;
  rotation?: number | null;
  width?: number | null;
  height?: number | null;
  x2?: number | null;
  y2?: number | null;
  points?: Array<{ x: number; y: number }> | null;
  text?: string | null;
  color?: string | null;
  fillColor?: string | null;
  textColor?: string | null;
  backgroundColor?: string | null;
  strokeWidth?: number | null;
  opacity?: number | null;
  radius?: number | null;
  fontSize?: number | null;
  fontWeight?: number | null;
  textAlign?: AnnotationTextAlign | null;
  lineStyle?: AnnotationLineStyle | null;
  order?: number | null;
  number?: number | null;
  locked?: boolean | null;
  showArrowHeadStart?: boolean | null;
  showArrowHeadEnd?: boolean | null;
  cursorVariant?: AnnotationCursorVariant | null;
  magnifyZoom?: number | null;
  tooltipPlacement?: AnnotationTooltipPlacement | null;
  blurAmount?: number | null;
  shadow?: boolean | null;
  asset?: StepAssetRef | null;
}

export interface StepCropRestoreState {
  asset: StepAssetRef;
  annotations: StepAnnotation[];
  capturedAt?: string | null;
}

export type StepTextBlockPosition =
  | "before-title"
  | "after-title"
  | "before-image"
  | "after-image"
  | "before-description"
  | "after-description";

export type TextBlockTone = "info" | "warning" | "success" | "error" | "dark";

export interface StepTextBlock {
  id: string;
  title: string;
  content: string;
  contentHtml?: string | null;
  tone: TextBlockTone;
  position: StepTextBlockPosition;
  collapsed?: boolean | null;
}

export interface StepSettings {
  forceNewPage: boolean;
  isContentBlock: boolean;
  isMultiCaptureStep: boolean;
  includeSubstepTitles: boolean;
  showStepNumber: boolean;
}

export interface StepDraft {
  id: string;
  title: string;
  notes: string;
  notesHtml?: string | null;
  kind: "action" | "note" | "section" | "content";
  status?: StepStatus | null;
  stepNumber?: number | null;
  clickIndex?: number | null;
  appName?: string | null;
  windowTitle?: string | null;
  contextLabel?: string | null;
  annotations?: StepAnnotation[] | null;
  textBlocks?: StepTextBlock[] | null;
  settings?: StepSettings | null;
  asset?: StepAssetRef | null;
  cropRestoreState?: StepCropRestoreState | null;
  capturedAt?: string | null;
}

export interface ProjectCover {
  kicker: string;
  subtitle: string;
  audience: string;
  outcome: string;
}

export type ProjectThemeTone = "sunrise" | "forest" | "midnight" | "coral";

export interface ProjectTheme {
  tone: ProjectThemeTone;
}

export interface ProjectGuideSettings {
  showCoverPage: boolean;
  showStepNumbers: boolean;
  useFocusedViewByDefault: boolean;
  defaultExportFormat:
    | "pdf"
    | "docx"
    | "simple-html"
    | "rich-html"
    | "json"
    | "pptx"
    | "markdown";
}

export interface ProjectPlaceholders {
  productName: string;
  workspaceName: string;
  teamName: string;
  ownerName: string;
}

export interface ProjectDraft {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  isFavorited: boolean;
  cover: ProjectCover;
  theme: ProjectTheme;
  guideSettings: ProjectGuideSettings;
  placeholders: ProjectPlaceholders;
  steps: StepDraft[];
}

export interface ProjectFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  folderName: string | null;
  isFavorited: boolean;
  stepCount: number;
  lastCapturedAt: string | null;
}

export interface ProjectLibrary {
  guides: ProjectSummary[];
  folders: ProjectFolder[];
}

export interface SaveProjectInput {
  project: ProjectDraft;
}

export interface CreateProjectInput {
  name?: string;
  folderId?: string | null;
}

export interface UpdateProjectMetaInput {
  id: string;
  patch: Partial<Pick<ProjectDraft, "name" | "description" | "folderId" | "isFavorited">>;
}

export interface DuplicateProjectInput {
  id: string;
}

export interface DeleteProjectsInput {
  ids: string[];
}

export interface MoveProjectsInput {
  ids: string[];
  folderId: string | null;
}

export interface ImportProjectImagesInput {
  project: ProjectDraft;
  filePaths?: string[] | null;
}

export interface ImportProjectImagesResult {
  project: ProjectDraft;
  importedSteps: StepDraft[];
}

export interface ImportAnnotationAssetInput {
  project: ProjectDraft;
  stepId: string;
}

export interface ImportAnnotationAssetResult {
  project: ProjectDraft;
  annotation: StepAnnotation;
  asset: StepAssetRef;
}

export interface OcrLanguageOption {
  code: string;
  label: string;
}

export interface RecognizeStepTextInput {
  project: ProjectDraft;
  stepId: string;
  language: string;
  selection?: SelectionRect | null;
}

export interface OcrRecognitionResult {
  stepId: string;
  language: string;
  text: string;
  confidence: number | null;
  lines: string[];
  selection: SelectionRect | null;
 }

export interface CropStepAssetInput {
  project: ProjectDraft;
  stepId: string;
  selection: SelectionRect;
}

export interface CropStepAssetResult {
  project: ProjectDraft;
  step: StepDraft;
  asset: StepAssetRef;
}

export interface RestoreStepAssetInput {
  project: ProjectDraft;
  stepId: string;
}

export interface RestoreStepAssetResult {
  project: ProjectDraft;
  step: StepDraft;
  asset: StepAssetRef;
}

export interface CreateFolderInput {
  name: string;
}

export interface RenameFolderInput {
  id: string;
  name: string;
}

export interface DeleteFolderInput {
  id: string;
}

export interface CaptureStepInput {
  project: ProjectDraft;
  title?: string;
  notes?: string;
}

export interface CaptureStepResult {
  project: ProjectDraft;
  capturedStep: StepDraft;
  asset: StepAssetRef;
  captureState: CaptureState;
  permissions: PermissionSnapshot;
  trigger?: ClickCaptureEvent;
}

export interface ExportHtmlInput {
  project: ProjectDraft;
}

export interface ExportHtmlResult {
  absolutePath: string;
  fileUrl: string;
  exportedAt: string;
  fileSize: number;
  themeTone: ProjectThemeTone;
}

export interface EasyDoApi {
  app: {
    getOverview: () => Promise<AppOverview>;
    getEditorUiPrefs: () => Promise<EditorUiPrefs>;
    patchEditorUiPrefs: (patch: Partial<EditorUiPrefs>) => Promise<EditorUiPrefs>;
    writeClipboardText: (text: string) => Promise<void>;
  };
  capture: {
    getState: () => Promise<CaptureState>;
    getPermissions: () => Promise<PermissionSnapshot>;
    prepare: (mode?: CaptureState["mode"]) => Promise<CaptureState>;
    start: (mode?: CaptureState["mode"]) => Promise<CaptureState>;
    pause: () => Promise<CaptureState>;
    stop: () => Promise<CaptureState>;
    captureStep: (input: CaptureStepInput) => Promise<CaptureStepResult>;
    beginAreaSelection: (input: CaptureStepInput) => Promise<CaptureStepResult | null>;
    getOverlayPayload: () => Promise<CaptureOverlayPayload | null>;
    getStudioPayload: () => Promise<CaptureStudioPayload | null>;
    confirmOverlaySelection: (rect: SelectionRect) => Promise<void>;
    continueOverlayClickStream: () => Promise<void>;
    cancelOverlaySelection: () => Promise<void>;
    startClickStream: (input: CaptureStepInput) => Promise<CaptureState>;
    startStudioCapture: () => Promise<CaptureState>;
    pauseStudioCapture: () => Promise<CaptureState>;
    resumeStudioCapture: () => Promise<CaptureState>;
    finishStudioCapture: () => Promise<CaptureState>;
    setStudioCaptureMode: (mode: CaptureTargetMode) => Promise<CaptureStudioPayload | null>;
    setStudioSelectionRect: (rect: SelectionRect) => Promise<CaptureStudioPayload | null>;
    setStudioCropperVisible: (visible: boolean) => Promise<CaptureStudioPayload | null>;
    acceptOverlayMouse: () => void;
    ignoreOverlayMouse: () => void;
    updateStudioLatestStep: (input: UpdateCaptureStudioLatestStepInput) => Promise<CaptureStudioPayload | null>;
    deleteStudioLatestStep: () => Promise<CaptureStudioPayload | null>;
    stopClickStream: () => Promise<CaptureState>;
    onStateChanged: (listener: (state: CaptureState) => void) => () => void;
    onAutoStepCreated: (listener: (result: CaptureStepResult) => void) => () => void;
    onClickStreamStatus: (listener: (status: ClickStreamStatus) => void) => () => void;
    onClickStreamError: (listener: (message: string) => void) => () => void;
    onClickStreamProgress: (listener: (progress: ClickStreamProgress) => void) => () => void;
    onStudioChanged: (listener: (payload: CaptureStudioPayload | null) => void) => () => void;
  };
  projects: {
    getLibrary: () => Promise<ProjectLibrary>;
    load: (id: string) => Promise<ProjectDraft | null>;
    save: (input: SaveProjectInput) => Promise<ProjectDraft>;
    createEmpty: (input?: CreateProjectInput) => Promise<ProjectDraft>;
    updateMeta: (input: UpdateProjectMetaInput) => Promise<ProjectDraft | null>;
    duplicate: (input: DuplicateProjectInput) => Promise<ProjectDraft | null>;
    deleteMany: (input: DeleteProjectsInput) => Promise<void>;
    moveMany: (input: MoveProjectsInput) => Promise<void>;
    importImages: (input: ImportProjectImagesInput) => Promise<ImportProjectImagesResult | null>;
    importAnnotationAsset: (input: ImportAnnotationAssetInput) => Promise<ImportAnnotationAssetResult | null>;
    getOcrLanguages: () => Promise<OcrLanguageOption[]>;
    recognizeStepText: (input: RecognizeStepTextInput) => Promise<OcrRecognitionResult | null>;
    cropStepAsset: (input: CropStepAssetInput) => Promise<CropStepAssetResult | null>;
    restoreStepAsset: (input: RestoreStepAssetInput) => Promise<RestoreStepAssetResult | null>;
    createFolder: (input: CreateFolderInput) => Promise<ProjectFolder>;
    renameFolder: (input: RenameFolderInput) => Promise<ProjectFolder | null>;
    deleteFolder: (input: DeleteFolderInput) => Promise<void>;
  };
  exports: {
    exportHtml: (input: ExportHtmlInput) => Promise<ExportHtmlResult>;
    previewHtml: (input: ExportHtmlInput) => Promise<string>;
    openPath: (absolutePath: string) => Promise<string>;
  };
}
