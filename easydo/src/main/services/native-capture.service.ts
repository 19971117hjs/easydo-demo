import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { app } from "electron";

type NativeCaptureDisplay = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleFactor: number;
  isPrimary: boolean;
  capture: () => Promise<Buffer>;
  captureArea: (x: number, y: number, width: number, height: number) => Promise<Buffer>;
  captureAreaSync: (x: number, y: number, width: number, height: number) => Buffer;
  captureSync: () => Buffer;
};

type NativeCaptureModule = {
  Screenshots: {
    all: () => NativeCaptureDisplay[];
    fromPoint: (x: number, y: number) => NativeCaptureDisplay | null;
  };
};

export type NativeCaptureDisplaySnapshot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleFactor: number;
  isPrimary: boolean;
};

function getCaptureBinaryName(): string {
  if (process.platform !== "darwin") {
    throw new Error(`Folge native capture is only configured for macOS. Current platform: ${process.platform}.`);
  }

  return process.arch === "arm64" ? "capture.darwin-arm64.node" : "capture.darwin-x64.node";
}

function toPlainDisplay(display: NativeCaptureDisplay): NativeCaptureDisplaySnapshot {
  return {
    id: String(display.id),
    x: display.x,
    y: display.y,
    width: display.width,
    height: display.height,
    rotation: display.rotation,
    scaleFactor: display.scaleFactor,
    isPrimary: display.isPrimary
  };
}

export class NativeCaptureService {
  private readonly nativeModule: NativeCaptureModule;
  private readonly binaryPath: string;
  private readonly workerPath: string;

  constructor() {
    const binaryName = getCaptureBinaryName();
    this.binaryPath = this.resolveBinaryPath(binaryName);
    this.workerPath = this.resolveWorkerPath();
    const require = createRequire(import.meta.url);
    this.nativeModule = require(this.binaryPath) as NativeCaptureModule;
  }

  getBinaryPath(): string {
    return this.binaryPath;
  }

  getWorkerPath(): string {
    return this.workerPath;
  }

  getDisplays(): NativeCaptureDisplaySnapshot[] {
    return this.nativeModule.Screenshots.all().map(toPlainDisplay);
  }

  getPrimaryDisplay(): NativeCaptureDisplaySnapshot {
    const display =
      this.nativeModule.Screenshots.all().find((candidate) => candidate.isPrimary) ??
      this.nativeModule.Screenshots.all()[0];

    if (!display) {
      throw new Error("Folge native capture did not return any displays.");
    }

    return toPlainDisplay(display);
  }

  getDisplayAtPoint(x: number, y: number): NativeCaptureDisplaySnapshot {
    const display = this.nativeModule.Screenshots.fromPoint(x, y);
    if (!display) {
      throw new Error(`Folge native capture could not resolve a display for point (${x}, ${y}).`);
    }

    return toPlainDisplay(display);
  }

  async captureDisplay(displayId: string): Promise<Buffer> {
    return this.captureInWorker("capture-display", [displayId]);
  }

  async captureDisplayArea(displayId: string, rect: { x: number; y: number; width: number; height: number }): Promise<Buffer> {
    return this.captureInWorker("capture-area", [
      displayId,
      String(rect.x),
      String(rect.y),
      String(rect.width),
      String(rect.height)
    ]);
  }

  private resolveBinaryPath(binaryName: string): string {
    const appPath = app.getAppPath();
    const candidates = app.isPackaged
      ? [join(process.resourcesPath, "native-capture", binaryName)]
      : [
          join(appPath, "..", "dist", "electron", binaryName),
          join(appPath, "resources", "native-capture", binaryName),
          join(dirname(appPath), "dist", "electron", binaryName)
        ];

    const match = candidates.find((candidate) => existsSync(candidate));
    if (!match) {
      throw new Error(
        `Folge native capture binary was not found. Looked in: ${candidates.join(", ")}`
      );
    }

    return match;
  }

  private resolveWorkerPath(): string {
    const appPath = app.getAppPath();
    const candidates = app.isPackaged
      ? [join(process.resourcesPath, "native-capture", "capture-worker.cjs")]
      : [
          join(appPath, "resources", "native-capture", "capture-worker.cjs"),
          join(dirname(appPath), "resources", "native-capture", "capture-worker.cjs")
        ];

    const match = candidates.find((candidate) => existsSync(candidate));
    if (!match) {
      throw new Error(`Native capture worker was not found. Looked in: ${candidates.join(", ")}`);
    }

    return match;
  }

  private captureInWorker(command: "capture-display" | "capture-area", args: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [this.workerPath, this.binaryPath, command, ...args], {
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: "1"
        },
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) {
          return;
        }

        settled = true;
        fn();
      };

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        settle(() => reject(error));
      });

      child.on("close", (code) => {
        if (settled) {
          return;
        }

        try {
          const message = JSON.parse(stdout || "{}") as { ok?: boolean; data?: string; error?: string };
          if (!message.ok || typeof message.data !== "string") {
            const workerError =
              message.error ||
              stderr.trim() ||
              `Native capture worker exited before returning image data (code ${code ?? "unknown"}).`;
            settle(() => reject(new Error(workerError)));
            return;
          }

          const base64Data = message.data;
          settle(() => resolve(Buffer.from(base64Data, "base64")));
        } catch {
          const workerError =
            stderr.trim() ||
            stdout.trim() ||
            `Native capture worker exited before returning image data (code ${code ?? "unknown"}).`;
          settle(() => reject(new Error(workerError)));
        }
      });
    });
  }
}
