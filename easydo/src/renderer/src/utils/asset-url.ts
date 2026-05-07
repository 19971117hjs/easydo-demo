import type { StepAssetRef } from "@shared/contracts";

export function resolveAssetUrl(asset: StepAssetRef | null | undefined): string {
  if (!asset) {
    return "";
  }

  if (asset.appUrl) {
    return asset.appUrl;
  }

  return `easydo-asset://local/${encodeURIComponent(asset.absolutePath)}`;
}
