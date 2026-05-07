import { EventEmitter } from "node:events";
import { createRequire } from "node:module";

type NativeMouseEvent = {
  type: string | number;
  button?: number;
  clicks?: number;
  x?: number;
  y?: number;
  mouse?: {
    button?: number;
    clicks?: number;
    x?: number;
    y?: number;
  };
};

type NativeHookModule = {
  startHook: (callback: (event: NativeMouseEvent) => void) => void;
  stopHook: () => void;
};

export type MouseClickEvent = {
  kind: "mouseclick" | "mousedown";
  button: number;
  clicks: number;
  x: number;
  y: number;
};

export class IOHookService extends EventEmitter {
  private readonly nativeModule: NativeHookModule;
  private hookStarted = false;
  private active = false;

  constructor() {
    super();
    const require = createRequire(import.meta.url);
    this.nativeModule = require("libuiohook-node") as NativeHookModule;
  }

  start(): void {
    if (!this.hookStarted) {
      this.nativeModule.startHook((event) => this.handleNativeEvent(event));
      this.hookStarted = true;
    }

    this.active = true;
  }

  pause(): void {
    this.active = false;
  }

  stop(): void {
    this.pause();
    if (this.hookStarted) {
      this.nativeModule.stopHook();
      this.hookStarted = false;
    }
  }

  private handleNativeEvent(event: NativeMouseEvent): void {
    if (!this.active) {
      return;
    }

    const eventKind =
      event?.type === "mouseclick" || event?.type === 6
        ? "mouseclick"
        : event?.type === "mousedown" || event?.type === 7
          ? "mousedown"
          : null;

    if (!eventKind) {
      return;
    }

    const payload = event.mouse ?? event;
    if (typeof payload.x !== "number" || typeof payload.y !== "number") {
      return;
    }

    this.emit(eventKind, {
      kind: eventKind,
      button: payload.button ?? 0,
      clicks: payload.clicks ?? 1,
      x: payload.x,
      y: payload.y
    } satisfies MouseClickEvent);
  }
}
