import { EventEmitter } from "node:events";
import type { CaptureState } from "@shared/contracts";

const DEFAULT_STATE: CaptureState = {
  status: "idle",
  mode: "guide",
  startedAt: null,
  lastStoppedAt: null
};

export class CaptureService extends EventEmitter {
  private state: CaptureState = { ...DEFAULT_STATE };

  getState(): CaptureState {
    return { ...this.state };
  }

  prepare(mode: CaptureState["mode"] = "guide"): CaptureState {
    this.state = {
      ...this.state,
      status: "preparing",
      mode
    };
    this.emitChange();
    return this.getState();
  }

  start(mode: CaptureState["mode"] = "guide"): CaptureState {
    this.state = {
      status: "recording",
      mode,
      startedAt: new Date().toISOString(),
      lastStoppedAt: this.state.lastStoppedAt
    };
    this.emitChange();
    return this.getState();
  }

  pause(): CaptureState {
    this.state = {
      ...this.state,
      status: "paused"
    };
    this.emitChange();
    return this.getState();
  }

  stop(): CaptureState {
    this.state = {
      status: "stopped",
      mode: this.state.mode,
      startedAt: this.state.startedAt,
      lastStoppedAt: new Date().toISOString()
    };
    this.emitChange();
    return this.getState();
  }

  reset(): CaptureState {
    this.state = { ...DEFAULT_STATE };
    this.emitChange();
    return this.getState();
  }

  private emitChange(): void {
    this.emit("changed", this.getState());
  }
}
