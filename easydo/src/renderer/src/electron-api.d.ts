import type { EasyDoApi } from "@shared/contracts";

declare global {
  interface Window {
    easydo: EasyDoApi;
  }
}

export {};
