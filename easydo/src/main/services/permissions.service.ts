import { app, systemPreferences } from "electron";
import type { PermissionSnapshot, PermissionState } from "@shared/contracts";
import { NativeCaptureService } from "@main/services/native-capture.service";

export class PermissionsService {
  private readonly nativeCaptureService: NativeCaptureService | null;

  constructor() {
    try {
      this.nativeCaptureService = new NativeCaptureService();
    } catch {
      this.nativeCaptureService = null;
    }
  }

  async getSnapshot(): Promise<PermissionSnapshot> {
    const notes: string[] = [];
    const accessibility = this.getAccessibilityStatus();
    let screenRecording: PermissionState = "unsupported";

    notes.push(
      `Runtime: ${app.isPackaged ? "packaged" : "development"} · app name: ${app.getName()} · exec: ${process.execPath}`
    );

    if (process.platform === "darwin") {
      try {
        const display = this.nativeCaptureService?.getPrimaryDisplay() ?? null;
        const image = display ? await this.nativeCaptureService?.captureDisplay(display.id) ?? null : null;
        const hasUsableCapture = Boolean(image && image.length > 0);
        screenRecording = hasUsableCapture ? "granted" : "denied";
        notes.push(
          hasUsableCapture
            ? "Folge native screen capture returned image data."
            : "Folge native screen capture returned no image data."
        );
      } catch (error) {
        screenRecording = "denied";
        notes.push(`Folge native screen capture probe failed: ${String(error)}`);
      }
    } else {
      screenRecording = "granted";
      notes.push("Non-macOS development path assumes screen capture is available.");
    }

    if (accessibility === "denied") {
      notes.push("Accessibility permission is not granted. Global input hooks will need this later.");
    }

    return {
      accessibility,
      screenRecording,
      canCaptureScreens: screenRecording === "granted",
      checkedAt: new Date().toISOString(),
      notes
    };
  }

  private getAccessibilityStatus(): PermissionState {
    if (process.platform !== "darwin") {
      return "unsupported";
    }

    return systemPreferences.isTrustedAccessibilityClient(false) ? "granted" : "denied";
  }

  requestAccessibilityAccess(): PermissionState {
    if (process.platform !== "darwin") {
      return "unsupported";
    }

    return systemPreferences.isTrustedAccessibilityClient(true) ? "granted" : "denied";
  }
}
