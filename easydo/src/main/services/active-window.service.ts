import { chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import type { ActiveWindowContext } from "@shared/step-intelligence";

type NativeActiveWindow = {
  title?: string;
  bounds?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  owner?: {
    name?: string;
  };
};

type ActiveWinModule = {
  sync: () => NativeActiveWindow;
};

export class ActiveWindowService {
  private readonly activeWinModule: ActiveWinModule | null;

  constructor() {
    try {
      const require = createRequire(import.meta.url);
      const packageJsonPath = require.resolve("active-win/package.json");
      const binaryPath = join(dirname(packageJsonPath), "main");
      chmodSync(binaryPath, 0o755);
      this.activeWinModule = require("active-win") as ActiveWinModule;
    } catch {
      this.activeWinModule = null;
    }
  }

  getSnapshot(): ActiveWindowContext | null {
    if (!this.activeWinModule) {
      return null;
    }

    try {
      const result = this.activeWinModule.sync();
      const width = result.bounds?.width ?? 0;
      const height = result.bounds?.height ?? 0;

      return {
        appName: result.owner?.name?.trim() || null,
        windowTitle: result.title?.trim() || null,
        bounds:
          width > 0 && height > 0
            ? {
                x: result.bounds?.x ?? 0,
                y: result.bounds?.y ?? 0,
                width,
                height
              }
            : null
      };
    } catch {
      return null;
    }
  }
}
