import { join } from "node:path";
import type { Rectangle } from "electron";
import { BrowserWindow, shell } from "electron";
import type { CaptureControlsLayout } from "@shared/contracts";

export class WindowService {
  private mainWindow: BrowserWindow | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private captureControlsWindow: BrowserWindow | null = null;

  private getLiveMainWindow(): BrowserWindow | null {
    if (!this.mainWindow) {
      return null;
    }

    if (this.mainWindow.isDestroyed()) {
      this.mainWindow = null;
      return null;
    }

    return this.mainWindow;
  }

  createMainWindow(): BrowserWindow {
    const window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 1120,
      minHeight: 760,
      backgroundColor: "#f3ede0",
      title: "easyDo",
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/index.cjs"),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    window.once("ready-to-show", () => {
      window.show();
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: "deny" };
    });

    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
      void window.loadURL(rendererUrl);
    } else {
      void window.loadFile(join(__dirname, "../renderer/index.html"));
    }

    window.on("closed", () => {
      if (this.mainWindow === window) {
        this.mainWindow = null;
      }
    });

    this.mainWindow = window;
    return window;
  }

  getMainWindow(): BrowserWindow | null {
    return this.getLiveMainWindow();
  }

  hideMainWindow(): void {
    this.getLiveMainWindow()?.hide();
  }

  showMainWindow(): void {
    const window = this.getLiveMainWindow();
    if (!window) {
      return;
    }

    if (window.isMinimized()) {
      window.restore();
    }

    window.show();
    window.focus();
  }

  createCaptureOverlayWindow(bounds: Rectangle): BrowserWindow {
    this.closeCaptureOverlayWindow();

    const window = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      roundedCorners: false,
      hasShadow: false,
      focusable: true,
      acceptFirstMouse: true,
      enableLargerThanScreen: true,
      backgroundColor: "#00000000",
      title: "easyDo Capture Overlay",
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/index.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });

    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
      void window.loadURL(`${rendererUrl}#/capture-overlay`);
    } else {
      void window.loadFile(join(__dirname, "../renderer/index.html"), {
        hash: "/capture-overlay"
      });
    }

    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setAlwaysOnTop(true, "screen-saver", 1);
    window.setContentProtection(true);

    window.once("ready-to-show", () => {
      window.show();
      window.focus();
    });

    window.on("closed", () => {
      if (this.overlayWindow === window) {
        this.overlayWindow = null;
      }
    });

    this.overlayWindow = window;
    return window;
  }

  createCaptureControlsWindow(
    bounds: Rectangle,
    layout: CaptureControlsLayout = { width: 286, height: 318 }
  ): BrowserWindow {
    this.closeCaptureControlsWindow();

    const { width, height } = layout;
    const x = bounds.x + bounds.width - width - 88;
    const y = bounds.y + Math.max(72, Math.round(bounds.height * 0.32));
    const window = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      closable: true,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      roundedCorners: false,
      hasShadow: true,
      acceptFirstMouse: true,
      enableLargerThanScreen: true,
      backgroundColor: "#00000000",
      title: "easyDo Capture Controls",
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/index.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });

    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
      void window.loadURL(`${rendererUrl}#/capture-controls`);
    } else {
      void window.loadFile(join(__dirname, "../renderer/index.html"), {
        hash: "/capture-controls"
      });
    }

    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.setAlwaysOnTop(true, "screen-saver", 1);
    window.setContentProtection(true);

    window.once("ready-to-show", () => {
      window.show();
      window.focus();
    });

    window.on("closed", () => {
      if (this.captureControlsWindow === window) {
        this.captureControlsWindow = null;
      }
    });

    this.captureControlsWindow = window;
    return window;
  }

  resizeCaptureControlsWindow(layout: CaptureControlsLayout): void {
    if (!this.captureControlsWindow || this.captureControlsWindow.isDestroyed()) {
      return;
    }

    const bounds = this.captureControlsWindow.getBounds();
    this.captureControlsWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: layout.width,
      height: layout.height
    });
  }

  acceptCaptureOverlayMouse(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      return;
    }

    if (typeof this.overlayWindow.setFocusable === "function") {
      this.overlayWindow.setFocusable(true);
    }

    this.overlayWindow.setIgnoreMouseEvents(false);
    this.overlayWindow.show();
    this.overlayWindow.focus();
  }

  ignoreCaptureOverlayMouse(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      return;
    }

    if (typeof this.overlayWindow.setFocusable === "function") {
      this.overlayWindow.setFocusable(false);
    }

    this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    this.overlayWindow.blur();
    this.overlayWindow.showInactive();
  }

  setCaptureOverlayInteractive(interactive: boolean): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      return;
    }

    if (interactive) {
      this.acceptCaptureOverlayMouse();
      return;
    }

    this.ignoreCaptureOverlayMouse();
  }

  hideCaptureChrome(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide();
    }

    if (this.captureControlsWindow && !this.captureControlsWindow.isDestroyed()) {
      this.captureControlsWindow.hide();
    }
  }

  showCaptureChrome(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.showInactive();
    }

    if (this.captureControlsWindow && !this.captureControlsWindow.isDestroyed()) {
      this.captureControlsWindow.showInactive();
    }
  }

  closeCaptureOverlayWindow(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close();
    }
    this.overlayWindow = null;
  }

  getCaptureOverlayWindow(): BrowserWindow | null {
    return this.overlayWindow;
  }

  closeCaptureControlsWindow(): void {
    if (this.captureControlsWindow && !this.captureControlsWindow.isDestroyed()) {
      this.captureControlsWindow.close();
    }
    this.captureControlsWindow = null;
  }

  closeCaptureWindows(): void {
    this.closeCaptureOverlayWindow();
    this.closeCaptureControlsWindow();
  }

  getCaptureControlsWindow(): BrowserWindow | null {
    return this.captureControlsWindow;
  }
}
