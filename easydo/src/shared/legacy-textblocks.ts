import type { TextBlockTone } from "./contracts";

export interface TextBlockPreset {
  tone: TextBlockTone;
  label: string;
  title: string;
  description: string;
  iconPath: string;
}

export const TEXT_BLOCK_PRESETS: TextBlockPreset[] = [
  {
    tone: "info",
    label: "Info",
    title: "Helpful context",
    description: "Explain what the operator should notice before continuing.",
    iconPath: "/folge-legacy/textblocks/info.svg"
  },
  {
    tone: "warning",
    label: "Warning",
    title: "Avoid this mistake",
    description: "Call out a risky action, destructive click, or hidden prerequisite.",
    iconPath: "/folge-legacy/textblocks/warning.svg"
  },
  {
    tone: "success",
    label: "Success",
    title: "Expected result",
    description: "Describe the exact outcome that confirms this step was completed correctly.",
    iconPath: "/folge-legacy/textblocks/success.svg"
  },
  {
    tone: "error",
    label: "Error",
    title: "If something looks wrong",
    description: "Add the recovery path, troubleshooting cue, or escalation note here.",
    iconPath: "/folge-legacy/textblocks/error.svg"
  },
  {
    tone: "dark",
    label: "Note",
    title: "Operator note",
    description: "Use a neutral callout for tips, clarifications, or business context.",
    iconPath: "/folge-legacy/textblocks/dark.svg"
  }
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createTextBlockHtml(tone: TextBlockTone): string {
  const preset = TEXT_BLOCK_PRESETS.find((item) => item.tone === tone) ?? TEXT_BLOCK_PRESETS[0];

  return `<div class="stepTextBlock ${preset.tone}" data-easydo-textblock="${preset.tone}">
    <div class="stepTextBlockIcon">
      <img src="${preset.iconPath}" alt="${escapeHtml(preset.label)}" />
    </div>
    <div class="stepTextBlockContent">
      <div class="stepTextBlockTitle">${escapeHtml(preset.title)}</div>
      <div class="stepTextBlockDescription"><p>${escapeHtml(preset.description)}</p></div>
    </div>
  </div><p></p>`;
}

export const LEGACY_TEXTBLOCK_CSS = `/* Folge-inspired text blocks */
.stepTextBlock {
  display: flex;
  border-radius: 0.25em;
  border-bottom: 3px solid transparent;
  flex-direction: row;
  align-items: center;
  padding: 0.75em;
  margin: 1em 0em;
}
.stepTextBlock.error {
  border-color: #feb2b2;
  background-color: #fed7d7;
}
.stepTextBlock.info {
  border-color: #90cdf4;
  background-color: #bee3f8;
}
.stepTextBlock.success {
  border-color: #9ae6b4;
  background-color: #c6f6d5;
}
.stepTextBlock.warning {
  border-color: #faf089;
  background-color: #fefcbf;
}
.stepTextBlock.dark {
  border-color: #e5e7eb;
  background-color: #f9fafb;
}
.stepTextBlock .stepTextBlockIcon {
  width: 2.5em;
  height: 2.5em;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
  display: flex;
  border: 2px solid transparent;
  border-radius: 9999px;
}
.stepTextBlock .stepTextBlockIcon img {
  width: 1.5em;
  height: 1.5em;
}
.stepTextBlock.error .stepTextBlockIcon {
  border-color: #f56565;
  background-color: #fff5f5;
  color: #f56565;
}
.stepTextBlock.info .stepTextBlockIcon {
  border-color: #4299e1;
  background-color: #ebf8ff;
  color: #4299e1;
}
.stepTextBlock.success .stepTextBlockIcon {
  border-color: #48bb78;
  background-color: #f0fff4;
  color: #48bb78;
}
.stepTextBlock.warning .stepTextBlockIcon {
  border-color: #ecc94b;
  background-color: #fffff0;
  color: #ecc94b;
}
.stepTextBlock.dark .stepTextBlockIcon {
  border-color: #e5e7eb;
  color: #e5e7eb;
}
.stepTextBlock .stepTextBlockContent {
  margin-left: 1em;
}
.stepTextBlock .stepTextBlockTitle {
  font-size: 1.125em;
  font-weight: 600;
}
.stepTextBlock.error .stepTextBlockTitle {
  color: #9b2c2c;
}
.stepTextBlock.dark .stepTextBlockTitle {
  color: #212936;
}
.stepTextBlock.info .stepTextBlockTitle {
  color: #2c5282;
}
.stepTextBlock.success .stepTextBlockTitle {
  color: #276749;
}
.stepTextBlock.warning .stepTextBlockTitle {
  color: #975a16;
}
.stepTextBlock .stepTextBlockDescription {
  font-size: .875em;
}
.stepTextBlock.error .stepTextBlockDescription {
  color: #e53e3e;
}
.stepTextBlock.info .stepTextBlockDescription {
  color: #3182ce;
}
.stepTextBlock.success .stepTextBlockDescription {
  color: #38a169;
}
.stepTextBlock.warning .stepTextBlockDescription {
  color: #d69e2e;
}
.stepTextBlock.dark .stepTextBlockDescription {
  color: #1f2937;
}
.stepTextBlock .stepTextBlockDescription p {
  padding: 0;
  margin: 0;
}`;
