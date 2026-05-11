import { EventEmitter } from "node:events";
import type {
  CaptureState,
  CaptureStepInput,
  ClickStreamProgress
} from "@shared/contracts";
import { CaptureService } from "@main/services/capture.service";
import { IOHookService, type MouseClickEvent } from "@main/services/iohook.service";
import { PermissionsService } from "@main/services/permissions.service";
import { ScreenCaptureService } from "@main/services/screen-capture.service";
import { WindowService } from "@main/services/window.service";

type ClickCaptureSession = {
  project: CaptureStepInput["project"];
  title?: string;
  notes?: string;
  armedAt: number;
  stopRequested: boolean;
  paused: boolean;
  acceptedCount: number;
  completedCount: number;
  sequence: number;
};

export class ClickStreamService extends EventEmitter {
  private session: ClickCaptureSession | null = null;
  private lastAcceptedClickAt = 0;
  private captureInFlight = false;
  private pendingClicks: MouseClickEvent[] = [];
  private lastAcceptedPoint: { x: number; y: number; button: number } | null = null;
  private lastEmittedAt: string | null = null;
  private suppressedUntil = 0;

  constructor(
    private readonly hookService: IOHookService,
    private readonly captureService: CaptureService,
    private readonly permissionsService: PermissionsService,
    private readonly screenCaptureService: ScreenCaptureService,
    private readonly windowService: WindowService
  ) {
    super();
    this.hookService.on("mouseclick", (event: MouseClickEvent) => {
      void this.handleMouseClick(event);
    });
  }

  async assertCanStartSession(requestPrompt = false): Promise<void> {
    const permissions = await this.permissionsService.getSnapshot();
    const accessibility =
      permissions.accessibility === "granted"
        ? "granted"
        : requestPrompt
          ? this.permissionsService.requestAccessibilityAccess()
          : permissions.accessibility;

    if (accessibility !== "granted") {
      throw new Error(
        "Accessibility permission is required for click stream capture. Grant it to the installed easyDo app in macOS Privacy & Security > Accessibility, then relaunch the app."
      );
    }
  }

  async startSession(input: CaptureStepInput): Promise<CaptureState> {
    await this.assertCanStartSession();

    this.session = {
      project: input.project,
      title: input.title,
      notes: input.notes,
      armedAt: Date.now(),
      stopRequested: false,
      paused: false,
      acceptedCount: 0,
      completedCount: 0,
      sequence: 0
    };
    this.suppressedUntil = Date.now() + 450;
    this.lastAcceptedClickAt = 0;
    this.lastAcceptedPoint = null;
    this.captureInFlight = false;
    this.pendingClicks = [];
    this.lastEmittedAt = null;
    this.hookService.start();
    this.emit("status", "armed");
    this.emitProgress();
    return this.captureService.start("guide");
  }

  pauseSession(): CaptureState {
    if (!this.session) {
      return this.captureService.pause();
    }

    this.session.paused = true;
    this.suppressedUntil = Date.now() + 450;
    this.hookService.pause();
    this.emit("status", "paused");
    return this.captureService.pause();
  }

  resumeSession(): CaptureState {
    if (!this.session) {
      return this.captureService.start("guide");
    }

    this.session.paused = false;
    this.session.armedAt = Date.now();
    this.suppressedUntil = Date.now() + 450;
    this.hookService.start();
    this.emit("status", "armed");
    return this.captureService.start("guide");
  }

  stopSession(): CaptureState {
    if (!this.session) {
      this.captureInFlight = false;
      this.pendingClicks = [];
      this.hookService.pause();
      this.emit("status", "stopped");
      this.windowService.showMainWindow();
      return this.captureService.stop();
    }

    this.session.stopRequested = true;
    this.hookService.pause();

    if (this.captureInFlight || this.pendingClicks.length > 0) {
      this.emit("status", "draining");
      this.emitProgress();
      if (!this.captureInFlight) {
        void this.processQueue();
      }
      return this.captureService.getState();
    }

    return this.finalizeStop();
  }

  isActive(): boolean {
    return !!this.session;
  }

  syncProject(project: CaptureStepInput["project"]): void {
    if (!this.session) {
      return;
    }

    this.session.project = project;
  }

  private async handleMouseClick(event: MouseClickEvent): Promise<void> {
    if (!this.session) {
      return;
    }

    if (this.session.stopRequested) {
      this.emit("status", "draining");
      return;
    }

    if (this.session.paused) {
      this.emit("status", "paused");
      return;
    }

    if (Date.now() - this.session.armedAt < 250) {
      this.emit("status", "warming-up");
      return;
    }

    if (Date.now() < this.suppressedUntil) {
      this.emit("status", "warming-up");
      return;
    }

    if (this.isDuplicateClick(event)) {
      this.emit("status", "debounced");
      return;
    }

    if (this.screenCaptureService.isOverlayCapturingPointerInteraction()) {
      this.emit("status", "ignored-control-window");
      return;
    }

    if (this.isClickInsideMainWindow(event.x, event.y)) {
      this.emit("status", "ignored-main-window");
      return;
    }

    if (this.isClickInsideControlWindow(event.x, event.y)) {
      this.emit("status", "ignored-control-window");
      return;
    }

    if (!this.screenCaptureService.isPointInsideStudioDisplay(event.x, event.y)) {
      this.emit("status", "debounced");
      return;
    }

    this.lastAcceptedClickAt = Date.now();
    this.lastAcceptedPoint = {
      x: event.x,
      y: event.y,
      button: event.button
    };
    this.session.acceptedCount += 1;
    this.lastEmittedAt = new Date().toISOString();
    this.pendingClicks.push(event);
    this.emitProgress();

    if (this.captureInFlight) {
      this.emit("status", "queued");
      return;
    }

    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (!this.session || this.captureInFlight) {
      return;
    }

    this.captureInFlight = true;

    try {
      while (this.session && this.pendingClicks.length > 0) {
        const event = this.pendingClicks.shift();
        if (!event) {
          continue;
        }

        const session = this.session;
        this.emit("status", session.stopRequested ? "draining" : "capturing");

        try {
          const result = await this.screenCaptureService.captureStepFromClick(
            {
              project: session.project,
              title: session.title,
              notes: session.notes
            },
            event,
            ++session.sequence
          );

          if (!this.session) {
            continue;
          }

          session.project = result.project;
          session.completedCount += 1;
          this.emit("step-created", result);
          this.emitProgress();
        } catch (error) {
          this.emit("error", this.toErrorMessage(error));
        }

        if (this.pendingClicks.length > 0) {
          this.emit("status", this.session?.stopRequested ? "draining" : "queued");
        }
      }
    } finally {
      this.captureInFlight = false;

      if (!this.session) {
        this.emit("status", "stopped");
        return;
      }

      if (this.session.stopRequested) {
        if (this.pendingClicks.length > 0) {
          void this.processQueue();
          return;
        }

        this.finalizeStop();
        return;
      }

      if (this.session.paused) {
        this.emit("status", "paused");
        return;
      }

      this.emit("status", "armed");
    }
  }

  private isDuplicateClick(event: MouseClickEvent): boolean {
    const withinTimeWindow = Date.now() - this.lastAcceptedClickAt < 120;
    if (!withinTimeWindow || !this.lastAcceptedPoint) {
      return false;
    }

    const sameButton = this.lastAcceptedPoint.button === event.button;
    const closeEnough =
      Math.abs(this.lastAcceptedPoint.x - event.x) <= 4 &&
      Math.abs(this.lastAcceptedPoint.y - event.y) <= 4;

    return sameButton && closeEnough;
  }

  private emitProgress(): void {
    const progress: ClickStreamProgress = {
      acceptedCount: this.session?.acceptedCount ?? 0,
      queuedCount: this.pendingClicks.length,
      completedCount: this.session?.completedCount ?? 0,
      lastEventAt: this.lastEmittedAt
    };

    this.emit("progress", progress);
  }

  private isClickInsideMainWindow(x: number, y: number): boolean {
    const mainWindow = this.windowService.getMainWindow();
    if (!mainWindow || !mainWindow.isVisible()) {
      return false;
    }

    const bounds = mainWindow.getBounds();
    if (!bounds) {
      return false;
    }

    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  private isClickInsideControlWindow(x: number, y: number): boolean {
    const controlsWindow = this.windowService.getCaptureControlsWindow();
    if (!controlsWindow || !controlsWindow.isVisible()) {
      return false;
    }

    const bounds = controlsWindow.getBounds();
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  private finalizeStop(): CaptureState {
    this.session = null;
    this.captureInFlight = false;
    this.pendingClicks = [];
    this.emit("status", "stopped");
    this.screenCaptureService.onClickStreamStopped();
    return this.captureService.stop();
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
