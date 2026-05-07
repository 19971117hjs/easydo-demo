import { desktopCapturer, systemPreferences } from "electron";
import type { PermissionSnapshot, PermissionState } from "@shared/contracts";

export class PermissionsService {
  async getSnapshot(): Promise<PermissionSnapshot> {
    const notes: string[] = [];
    const accessibility = this.getAccessibilityStatus();
    let screenRecording: PermissionState = "unsupported";

    if (process.platform === "darwin") {
      try {
        const sources = await desktopCapturer.getSources({
          types: ["screen"],
          thumbnailSize: { width: 32, height: 18 },
          fetchWindowIcons: false
        });

        const hasUsableThumbnail = sources.some((source) => !source.thumbnail.isEmpty());
        screenRecording = hasUsableThumbnail ? "granted" : "denied";
        notes.push(
          hasUsableThumbnail
            ? "Screen thumbnails are available to the app."
            : "Screen thumbnails are empty. macOS Screen Recording permission is likely missing."
        );
      } catch (error) {
        screenRecording = "denied";
        notes.push(`Screen capture probe failed: ${String(error)}`);
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
}
