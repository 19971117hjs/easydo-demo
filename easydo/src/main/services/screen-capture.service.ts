import { EventEmitter } from "node:events";
import { desktopCapturer, screen } from "electron";
import type {
  CaptureControlsLayout,
  CaptureOverlayPayload,
  CaptureState,
  CaptureStepInput,
  CaptureStepResult,
  CaptureStudioLatestStep,
  CaptureStudioPayload,
  CaptureStudioPhase,
  CaptureTargetMode,
  ClickCaptureEvent,
  ClickStreamStatus,
  SelectionRect,
  UpdateCaptureStudioLatestStepInput
} from "@shared/contracts";
import { CaptureService } from "@main/services/capture.service";
import { ActiveWindowService } from "@main/services/active-window.service";
import type { MouseClickEvent } from "@main/services/iohook.service";
import { PermissionsService } from "@main/services/permissions.service";
import { ProjectService } from "@main/services/project.service";
import { WindowService } from "@main/services/window.service";
import { buildStepNarrative, resolveInteractionContainer } from "@shared/step-intelligence";

type DisplaySnapshot = {
  id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  label: string;
};

type PendingAreaSelection = {
  input: CaptureStepInput;
  image: Electron.NativeImage;
  displayLabel: string;
  displayBounds: DisplaySnapshot["bounds"];
  resolve: (result: CaptureStepResult | null) => void;
  reject: (error: unknown) => void;
};

type PendingClickStreamHandoff = {
  input: CaptureStepInput;
  display: DisplaySnapshot;
};

type ClickCaptureStudioSession = {
  input: CaptureStepInput;
  phase: CaptureStudioPhase;
  captureMode: CaptureTargetMode;
  display: DisplaySnapshot;
  backdropImageDataUrl: string;
  backdropImageSize: {
    width: number;
    height: number;
  };
  cropperVisible: boolean;
  selectedRegion: SelectionRect;
  activeWindowBounds: SelectionRect | null;
  activeWindowLabel: string | null;
  latestStep: CaptureStudioLatestStep | null;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPlainResult(result: CaptureStepResult | null): CaptureStepResult | null {
  if (!result) {
    return null;
  }

  return JSON.parse(JSON.stringify(result)) as CaptureStepResult;
}

function clampRectToBounds(
  rect: SelectionRect,
  bounds: { width: number; height: number }
): SelectionRect {
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

export class ScreenCaptureService extends EventEmitter {
  private overlayPayload: CaptureOverlayPayload | null = null;
  private pendingAreaSelection: PendingAreaSelection | null = null;
  private pendingClickStreamHandoff: PendingClickStreamHandoff | null = null;
  private clickCaptureStudio: ClickCaptureStudioSession | null = null;

  constructor(
    private readonly captureService: CaptureService,
    private readonly permissionsService: PermissionsService,
    private readonly activeWindowService: ActiveWindowService,
    private readonly projectService: ProjectService,
    private readonly windowService: WindowService
  ) {
    super();
  }

  async captureStep(input: CaptureStepInput): Promise<CaptureStepResult> {
    const { image, display, permissions, currentState } = await this.capturePrimaryDisplay();
    const stepNumber = input.project.steps.length + 1;
    const annotatedScreenshot = await this.annotateCaptureOnImage(image.toPNG(), image.getSize(), {
      stepNumber
    });
    const result = await this.projectService.addCapturedStep({
      project: input.project,
      screenshot: annotatedScreenshot,
      title: input.title?.trim() || `Step ${String(stepNumber).padStart(2, "0")}. Capture the current screen state`,
      notes:
        input.notes?.trim() ||
        `Review the visible screen for step ${String(stepNumber).padStart(2, "0")}, then describe the exact UI state the operator should confirm before moving on.`,
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

  async captureStepFromClick(
    input: CaptureStepInput,
    clickEvent: MouseClickEvent,
    sequence: number
  ): Promise<CaptureStepResult> {
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

  async beginAreaSelection(input: CaptureStepInput): Promise<CaptureStepResult | null> {
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
        suggestedNotes:
          input.notes?.trim() || "Describe what should happen inside this selected region."
      };

      this.windowService.createCaptureOverlayWindow(display.bounds);

      return await new Promise<CaptureStepResult | null>((resolve, reject) => {
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

  async beginClickStreamHandoff(input: CaptureStepInput): Promise<CaptureState> {
    if (this.pendingAreaSelection || this.pendingClickStreamHandoff || this.clickCaptureStudio) {
      throw new Error("Another capture overlay is already in progress.");
    }

    const permissions = await this.permissionsService.getSnapshot();
    if (!permissions.canCaptureScreens) {
      throw new Error("Screen Recording permission is required for click stream capture.");
    }

    const currentDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const display: DisplaySnapshot = {
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
      description:
        "easyDo will hide while recording your clicks so the target app stays visible. Press Esc to cancel and return to guide setup.",
      confirmLabel: "Continue Capture"
    };
    this.windowService.createCaptureOverlayWindow(display.bounds);
    this.emitClickStreamStatus("handoff");
    return this.captureService.prepare("guide");
  }

  getOverlayPayload(): CaptureOverlayPayload | null {
    return this.overlayPayload;
  }

  getStudioPayload(): CaptureStudioPayload | null {
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
      activeWindowBounds: this.clickCaptureStudio.activeWindowBounds
        ? { ...this.clickCaptureStudio.activeWindowBounds }
        : null,
      activeWindowLabel: this.clickCaptureStudio.activeWindowLabel,
      cropperVisible: this.clickCaptureStudio.cropperVisible,
      stepCount: this.clickCaptureStudio.input.project.steps.length,
      latestStep: this.clickCaptureStudio.latestStep
        ? { ...this.clickCaptureStudio.latestStep }
        : null
    };
  }

  async continueOverlayClickStream(): Promise<void> {
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

  prepareStudioForRecording(): void {
    if (!this.clickCaptureStudio) {
      throw new Error("No click capture studio session is active.");
    }

    this.clickCaptureStudio.phase = "recording";
    this.overlayPayload = this.createStudioOverlayPayload();
    this.ensureCaptureControlsWindow();
    this.syncStudioChrome();
    this.emitStudioChanged();
  }

  pauseStudioSession(): void {
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

  resumeStudioSession(): void {
    if (!this.clickCaptureStudio) {
      return;
    }

    this.clickCaptureStudio.phase = "recording";
    this.overlayPayload = this.createStudioOverlayPayload();
    this.ensureCaptureControlsWindow();
    this.syncStudioChrome();
    this.emitStudioChanged();
  }

  completeStudioSession(showMainWindow = true): void {
    this.pendingClickStreamHandoff = null;
    this.clickCaptureStudio = null;
    this.overlayPayload = null;
    this.windowService.closeCaptureWindows();
    if (showMainWindow) {
      this.windowService.showMainWindow();
    }
    this.emitStudioChanged();
  }

  async finishStudioWithoutRecording(): Promise<CaptureState> {
    this.completeStudioSession(true);
    this.emitClickStreamStatus("stopped");
    return this.captureService.reset();
  }

  async setStudioCaptureMode(mode: CaptureTargetMode): Promise<CaptureStudioPayload | null> {
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

  async setStudioSelectionRect(rect: SelectionRect): Promise<CaptureStudioPayload | null> {
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

  async setStudioCropperVisible(visible: boolean): Promise<CaptureStudioPayload | null> {
    if (!this.clickCaptureStudio) {
      return null;
    }

    this.clickCaptureStudio.cropperVisible = visible;
    this.overlayPayload = this.createStudioOverlayPayload();
    this.syncStudioChrome();
    this.emitStudioChanged();
    return this.getStudioPayload();
  }

  async updateStudioLatestStep(
    input: UpdateCaptureStudioLatestStepInput
  ): Promise<CaptureStudioPayload | null> {
    if (!this.clickCaptureStudio?.latestStep) {
      return null;
    }

    const latestStepId = this.clickCaptureStudio.latestStep.stepId;
    const project = this.clickCaptureStudio.input.project;
    const nextProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      steps: project.steps.map((step) =>
        step.id === latestStepId
          ? {
              ...step,
              title: input.title !== undefined ? input.title : step.title,
              notes: input.notes !== undefined ? input.notes : step.notes
            }
          : step
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

  async deleteStudioLatestStep(): Promise<CaptureStudioPayload | null> {
    if (!this.clickCaptureStudio?.latestStep) {
      return null;
    }

    const latestStepId = this.clickCaptureStudio.latestStep.stepId;
    const project = this.clickCaptureStudio.input.project;
    const nextProject = {
      ...project,
      updatedAt: new Date().toISOString(),
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

  getStudioCaptureInput(): CaptureStepInput | null {
    if (!this.clickCaptureStudio) {
      return null;
    }

    return {
      project: this.clickCaptureStudio.input.project,
      title: this.clickCaptureStudio.input.title,
      notes: this.clickCaptureStudio.input.notes
    };
  }

  isPointInsideStudioDisplay(x: number, y: number): boolean {
    const studioBounds = this.clickCaptureStudio?.display.bounds;
    if (!studioBounds) {
      return true;
    }

    return (
      x >= studioBounds.x &&
      x <= studioBounds.x + studioBounds.width &&
      y >= studioBounds.y &&
      y <= studioBounds.y + studioBounds.height
    );
  }

  onClickStreamStopped(): void {
    this.completeStudioSession(true);
  }

  async confirmOverlaySelection(rect: SelectionRect): Promise<void> {
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
      const currentState =
        this.captureService.getState().status === "recording"
          ? this.captureService.getState()
          : this.captureService.start("guide");
      const stepNumber = pending.input.project.steps.length + 1;
      const annotatedScreenshot = await this.annotateCaptureOnImage(
        croppedImage.toPNG(),
        croppedImage.getSize(),
        { stepNumber }
      );

      const result = await this.projectService.addCapturedStep({
        project: pending.input.project,
        screenshot: annotatedScreenshot,
        title:
          pending.input.title?.trim() ||
          `Step ${String(stepNumber).padStart(2, "0")}. Capture the selected area`,
        notes:
          pending.input.notes?.trim() ||
          "Describe what the operator should focus on inside this selected area, then note the expected visible result.",
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

  async cancelAreaSelection(): Promise<void> {
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

  private recordStudioStep(result: CaptureStepResult): void {
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

  private buildStudioLatestStep(step: CaptureStepResult["capturedStep"]): CaptureStudioLatestStep {
    return {
      stepId: step.id,
      stepNumber: step.stepNumber ?? 0,
      title: step.title,
      notes: step.notes,
      assetAppUrl: step.asset?.appUrl ?? ""
    };
  }

  private createStudioOverlayPayload(): CaptureOverlayPayload | null {
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
      studio: this.getStudioPayload() ?? undefined
    };
  }

  private emitStudioChanged(): void {
    this.emit("studio-changed", this.getStudioPayload());
  }

  private syncStudioChrome(): void {
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

  private ensureCaptureControlsWindow(): void {
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

  private getCaptureControlsLayout(
    studio: ClickCaptureStudioSession
  ): CaptureControlsLayout {
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

  private async refreshStudioActiveWindowTarget(): Promise<void> {
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

  private updateStudioActiveWindowState(bounds: SelectionRect, label: string): void {
    if (!this.clickCaptureStudio) {
      return;
    }

    this.clickCaptureStudio.activeWindowBounds = { ...bounds };
    this.clickCaptureStudio.activeWindowLabel = label;
  }

  private resolveActiveWindowTarget(
    display: DisplaySnapshot,
    activeWindow: ReturnType<ActiveWindowService["getSnapshot"]>
  ): { bounds: SelectionRect; label: string } | null {
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

  private getStudioSelectionForDisplay(
    displayBounds: DisplaySnapshot["bounds"]
  ): SelectionRect | null {
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

  private createDefaultStudioSelection(
    displayBounds: DisplaySnapshot["bounds"]
  ): SelectionRect {
    const width = Math.min(1280, Math.round(displayBounds.width * 0.68));
    const height = Math.min(540, Math.round(displayBounds.height * 0.5));
    return {
      x: Math.max(24, Math.round((displayBounds.width - width) / 2)),
      y: Math.max(32, Math.round((displayBounds.height - height) / 2) - 96),
      width,
      height
    };
  }

  private async capturePrimaryDisplay(): Promise<{
    image: Electron.NativeImage;
    display: DisplaySnapshot;
    permissions: Awaited<ReturnType<PermissionsService["getSnapshot"]>>;
    currentState: ReturnType<CaptureService["getState"]>;
  }> {
    return this.captureDisplayFromElectronDisplay(screen.getPrimaryDisplay());
  }

  private async captureDisplayPreview(display: DisplaySnapshot): Promise<{
    image: Electron.NativeImage;
  }> {
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

  private async captureDisplayAtPoint(
    x: number,
    y: number,
    maxCaptureWidth = 2300
  ): Promise<{
    image: Electron.NativeImage;
    display: DisplaySnapshot;
    permissions: Awaited<ReturnType<PermissionsService["getSnapshot"]>>;
    currentState: ReturnType<CaptureService["getState"]>;
  }> {
    return this.captureDisplayFromElectronDisplay(
      screen.getDisplayNearestPoint({ x, y }),
      maxCaptureWidth
    );
  }

  private async captureDisplayFromElectronDisplay(
    electronDisplay: Electron.Display,
    maxCaptureWidth = 2300
  ): Promise<{
    image: Electron.NativeImage;
    display: DisplaySnapshot;
    permissions: Awaited<ReturnType<PermissionsService["getSnapshot"]>>;
    currentState: ReturnType<CaptureService["getState"]>;
  }> {
    const permissions = await this.permissionsService.getSnapshot();
    if (!permissions.canCaptureScreens) {
      throw new Error(
        "Screen capture is not available yet. Grant Screen Recording permission and retry."
      );
    }

    const { image, label } = await this.captureDisplayThumbnail(electronDisplay, maxCaptureWidth);

    const currentState =
      this.captureService.getState().status === "recording"
        ? this.captureService.getState()
        : this.captureService.start("guide");

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

  private resolveElectronDisplay(display: DisplaySnapshot): Electron.Display | null {
    return (
      screen
        .getAllDisplays()
        .find(
          (electronDisplay) =>
            String(electronDisplay.id) === display.id ||
            (electronDisplay.bounds.x === display.bounds.x &&
              electronDisplay.bounds.y === display.bounds.y &&
              electronDisplay.bounds.width === display.bounds.width &&
              electronDisplay.bounds.height === display.bounds.height)
        ) ?? null
    );
  }

  private async captureDisplayThumbnail(
    electronDisplay: Electron.Display,
    maxCaptureWidth: number
  ): Promise<{ image: Electron.NativeImage; label: string }> {
    const captureWidth = Math.min(
      Math.round(electronDisplay.size.width * electronDisplay.scaleFactor),
      maxCaptureWidth
    );
    const aspectRatio = electronDisplay.size.width / electronDisplay.size.height;
    const captureHeight = Math.max(1, Math.round(captureWidth / aspectRatio));

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: captureWidth,
        height: captureHeight
      },
      fetchWindowIcons: false
    });

    const matchingSource =
      sources.find((source) => source.display_id === String(electronDisplay.id)) ?? sources[0];

    if (!matchingSource || matchingSource.thumbnail.isEmpty()) {
      throw new Error("Unable to capture the current display. The returned thumbnail is empty.");
    }

    return {
      image: matchingSource.thumbnail,
      label: matchingSource.name || `Display ${electronDisplay.id}`
    };
  }

  private async refreshStudioBackdrop(): Promise<void> {
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

  private async annotateCaptureOnImage(
    screenshot: Buffer,
    imageSize: { width: number; height: number },
    options: {
      stepNumber: number;
      clickIndex?: number | null;
      clickPoint?: { x: number; y: number };
      displayBounds?: { width: number; height: number };
    }
  ): Promise<Buffer> {
    const { default: sharp } = await import("sharp");
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

    return sharp(screenshot)
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0
        }
      ])
      .png()
      .toBuffer();
  }

  private buildClickCaptureEvent(
    clickEvent: MouseClickEvent,
    display: DisplaySnapshot,
    sequence: number
  ): ClickCaptureEvent {
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
      capturedAt: new Date().toISOString()
    };
  }

  private describeMouseButton(button: number): string {
    if (button === 1) return "left click";
    if (button === 2) return "right click";
    if (button === 3) return "middle click";
    return `button ${button}`;
  }

  private describeRegion(x: number, y: number, width: number, height: number): string {
    const horizontal = x < width / 3 ? "left" : x > (width * 2) / 3 ? "right" : "center";
    const vertical = y < height / 3 ? "top" : y > (height * 2) / 3 ? "bottom" : "middle";
    return `${vertical}-${horizontal}`;
  }

  private normalizeRect(
    rect: SelectionRect,
    displayBounds: { width: number; height: number },
    imageSize: { width: number; height: number }
  ): SelectionRect {
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

  private finishAreaSelection(result: CaptureStepResult | null): void {
    const pending = this.pendingAreaSelection;
    if (!pending) {
      return;
    }

    pending.resolve(toPlainResult(result));
    this.resetAreaSelectionState();
    this.windowService.closeCaptureWindows();
    this.windowService.showMainWindow();
  }

  private resetAreaSelectionState(): void {
    this.pendingAreaSelection = null;
    this.overlayPayload = null;
  }

  private emitClickStreamStatus(status: ClickStreamStatus): void {
    this.emit("click-stream-status", status);
  }

}
