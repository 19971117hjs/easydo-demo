import { readFile } from "node:fs/promises";
import type { ProjectDraft, StepDraft } from "./contracts";
import { LEGACY_TEXTBLOCK_CSS } from "./legacy-textblocks";
import { buildAnnotationOverlayMarkup } from "./step-annotations";
import { normalizeNotesHtml } from "./step-content";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function assetToDataUrl(absolutePath: string): Promise<string> {
  const buffer = await readFile(absolutePath);
  const extension = absolutePath.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  return `data:image/${extension};base64,${buffer.toString("base64")}`;
}

function renderDescription(step: StepDraft): string {
  return normalizeNotesHtml(step.notesHtml, step.notes);
}

async function renderStep(step: StepDraft, embedAssets: boolean): Promise<string> {
  const description = renderDescription(step);
  const imageSource = step.asset
    ? embedAssets
      ? await assetToDataUrl(step.asset.absolutePath)
      : step.asset.appUrl
    : null;
  const annotationMarkup =
    step.asset && step.kind === "action"
      ? await buildAnnotationOverlayMarkup(
          step.annotations,
          {
            width: step.asset.width,
            height: step.asset.height
          },
          imageSource,
          async (asset) => (embedAssets ? assetToDataUrl(asset.absolutePath) : asset.appUrl)
        )
      : "";
  const imageMarkup =
    step.asset && step.kind === "action"
      ? `<p class="stepImageCover">
          <span class="stepImageStage">
            <img alt="${escapeHtml(step.title)}" class="img-responsive stepImage" src="${imageSource}" />
            ${annotationMarkup}
          </span>
        </p>`
      : "";

  if (step.kind === "section") {
    return `<div class="stepCard" id="step-${step.id}">
      <p class="stepTitle">
        <b>${escapeHtml(String(step.stepNumber ?? ""))}</b>
        <span class="stepTitleText">${escapeHtml(step.title)}</span>
      </p>
      <div class="stepDescription quillClasses">${description}</div>
    </div>`;
  }

  return `<div class="stepCard" id="step-${step.id}">
    <p class="stepTitle">
      <b>${escapeHtml(String(step.stepNumber ?? ""))}</b>
      <span class="stepTitleText">${escapeHtml(step.title)}</span>
    </p>
    ${description ? `<div class="stepDescription quillClasses">${description}</div><br />` : ""}
    ${imageMarkup}
  </div>`;
}

export async function buildExportHtml(project: ProjectDraft): Promise<string> {
  const stepsHtml = await Promise.all(project.steps.map((step) => renderStep(step, true)));

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(project.name)}</title>
  <style>
    body {
      margin: 10px;
      font-family: "Avenir Next", "PingFang SC", sans-serif;
      background: #eff0f3;
      color: #0d0d0d;
    }
    p {
      margin: 0 0 0.6rem;
    }
    .guideShell {
      max-width: 1180px;
      margin: 0 auto;
      padding: 2rem 1rem 4rem;
    }
    .guideHero {
      background: linear-gradient(135deg, rgba(24, 28, 34, 0.98), rgba(58, 44, 34, 0.94));
      color: #f8f3ea;
      border-radius: 28px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.15);
      padding: 2rem;
      margin-bottom: 2rem;
    }
    .guideHeroKicker {
      display: inline-block;
      margin-bottom: 0.75rem;
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .guideHeroTitle {
      margin: 0 0 0.8rem;
      font-size: 2.7rem;
      line-height: 1;
    }
    .guideHeroDescription {
      max-width: 760px;
      color: rgba(248, 243, 234, 0.82);
      line-height: 1.7;
    }
    .guideHeroMeta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 1.3rem;
    }
    .guideHeroCard {
      padding: 1rem;
      border-radius: 18px;
      background: rgba(255,255,255,0.08);
    }
    .guideHeroCard span {
      display: block;
      color: rgba(248, 243, 234, 0.72);
      font-size: 0.82rem;
    }
    .guideHeroCard strong {
      display: block;
      margin-top: 0.5rem;
      font-size: 1.05rem;
    }
    .guideMain {
      background: transparent;
    }
    .stepCard {
      page-break-inside: avoid;
      page-break-after: auto;
      background: white;
      border-radius: 24px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.15);
      padding: 1.8rem 2rem;
      margin-bottom: 1.4rem;
    }
    .stepTitle {
      font-weight: 500;
      font-size: 1.2rem;
    }
    .stepTitle b {
      margin-right: 0.5rem;
    }
    .stepDescription {
      color: #38424d;
      line-height: 1.7;
    }
    .stepImageCover {
      text-align: center;
    }
    .stepImageStage {
      position: relative;
      display: inline-block;
      width: 100%;
    }
    .stepImage {
      display: block;
      max-width: 100%;
      border-radius: 16px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.15);
    }
    .stepAnnotationLayer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .stepAnnotationSvg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .stepAnnotationBlur {
      position: absolute;
      border: 3px solid #f2b91f;
      border-radius: 0;
      background: rgba(16, 24, 32, 0.22);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.36);
    }
    .stepAnnotationMagnify {
      position: absolute;
      overflow: hidden;
      border: 4px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 12px 28px rgba(18, 24, 32, 0.22);
      background: rgba(255,255,255,0.18);
    }
    .stepAnnotationMagnifyLens {
      position: absolute;
      inset: 0;
      background-repeat: no-repeat;
      background-color: rgba(255,255,255,0.16);
    }
    .stepAnnotationAsset {
      position: absolute;
      overflow: hidden;
      box-shadow: 0 12px 26px rgba(18, 24, 32, 0.18);
      background: rgba(255,255,255,0.18);
    }
    .stepAnnotationAssetImage {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }
    .quillClasses p {
      margin: 0 0 0.75rem;
    }
    .quillClasses blockquote {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      border-left: 4px solid #d77a2a;
      background: #f9f3ea;
    }
    .quillClasses img {
      max-width: 100%;
    }
    ${LEGACY_TEXTBLOCK_CSS}
    @media (max-width: 900px) {
      .guideHeroMeta {
        grid-template-columns: 1fr;
      }
      .guideHeroTitle {
        font-size: 2rem;
      }
      .stepCard {
        padding: 1.2rem;
      }
    }
  </style>
</head>
<body>
  <div class="guideShell">
    <section class="guideHero">
      <span class="guideHeroKicker">${escapeHtml(project.cover.kicker)}</span>
      <h1 class="guideHeroTitle">${escapeHtml(project.name)}</h1>
      <div class="guideHeroDescription">${escapeHtml(project.cover.subtitle || project.description)}</div>
      <div class="guideHeroMeta">
        <div class="guideHeroCard">
          <span>Audience</span>
          <strong>${escapeHtml(project.cover.audience)}</strong>
        </div>
        <div class="guideHeroCard">
          <span>Outcome</span>
          <strong>${escapeHtml(project.cover.outcome)}</strong>
        </div>
        <div class="guideHeroCard">
          <span>Steps</span>
          <strong>${project.steps.length}</strong>
        </div>
      </div>
    </section>
    <main class="guideMain">
      ${stepsHtml.join("")}
    </main>
  </div>
</body>
</html>`;
}

export async function buildPreviewHtml(project: ProjectDraft): Promise<string> {
  const stepsHtml = await Promise.all(project.steps.map((step) => renderStep(step, false)));

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body {
      margin: 0;
      font-family: "Avenir Next", "PingFang SC", sans-serif;
      background: #eff0f3;
      color: #0d0d0d;
    }
    .guideShell {
      max-width: 1080px;
      margin: 0 auto;
      padding: 1rem;
    }
    .guideHero {
      background: white;
      border-radius: 24px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.15);
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .guideHeroKicker {
      color: #9c5a23;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.76rem;
    }
    .guideHeroTitle {
      margin: 0.7rem 0;
      font-size: 2rem;
      line-height: 1.05;
    }
    .guideHeroDescription {
      color: #42515c;
      line-height: 1.7;
    }
    .stepCard {
      background: white;
      border-radius: 20px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.12);
      padding: 1.3rem 1.4rem;
      margin-bottom: 1rem;
    }
    .stepTitle {
      font-weight: 600;
      font-size: 1.05rem;
      margin-bottom: 0.8rem;
    }
    .stepTitle b {
      margin-right: 0.45rem;
    }
    .stepDescription {
      color: #42515c;
      line-height: 1.7;
    }
    .stepImageCover {
      text-align: center;
    }
    .stepImageStage {
      position: relative;
      display: inline-block;
      width: 100%;
    }
    .stepImage {
      display: block;
      max-width: 100%;
      border-radius: 14px;
      box-shadow: 0 0.25rem 1rem rgba(48,55,66,.12);
    }
    .stepAnnotationLayer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .stepAnnotationSvg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .stepAnnotationBlur {
      position: absolute;
      border: 3px solid #f2b91f;
      border-radius: 0;
      background: rgba(16, 24, 32, 0.22);
      backdrop-filter: blur(11px);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.36);
    }
    .quillClasses p {
      margin: 0 0 0.75rem;
    }
    .quillClasses blockquote {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      border-left: 4px solid #d77a2a;
      background: #f9f3ea;
    }
    .quillClasses img {
      max-width: 100%;
    }
    ${LEGACY_TEXTBLOCK_CSS}
  </style>
</head>
<body>
  <div class="guideShell">
    <section class="guideHero">
      <div class="guideHeroKicker">${escapeHtml(project.cover.kicker)}</div>
      <h1 class="guideHeroTitle">${escapeHtml(project.name)}</h1>
      <div class="guideHeroDescription">${escapeHtml(project.cover.subtitle || project.description)}</div>
    </section>
    ${stepsHtml.join("")}
  </div>
</body>
</html>`;
}
