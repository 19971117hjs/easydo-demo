export type RecorderTone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface RecorderBadge {
  label: string;
  value: string;
  tone: RecorderTone;
}

export interface RecorderMetric {
  label: string;
  value: string;
  hint?: string;
  tone?: RecorderTone;
}

export interface RecorderPermissionItem {
  id: string;
  label: string;
  value: string;
  summary: string;
  tone: RecorderTone;
}

export interface RecorderPreviewSummary {
  title: string;
  imageUrl: string;
  badges: string[];
  details: string[];
  absolutePath: string;
}
