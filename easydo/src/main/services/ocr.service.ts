import { mkdir } from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
import sharp from "sharp";
import type {
  OcrLanguageOption,
  OcrRecognitionResult,
  RecognizeStepTextInput
} from "@shared/contracts";
import type { Worker as TesseractWorker } from "tesseract.js";

const OCR_LANGUAGE_OPTIONS: OcrLanguageOption[] = [
  { code: "eng", label: "English" },
  { code: "chi_sim", label: "简体中文" },
  { code: "eng+chi_sim", label: "English + 简体中文" },
  { code: "deu", label: "Deutsch" },
  { code: "fra", label: "Français" },
  { code: "spa", label: "Español" },
  { code: "por", label: "Português" },
  { code: "jpn", label: "日本語" }
];

const OCR_MAX_DIMENSION = 2200;
const OCR_MIN_SELECTION_DIMENSION = 1200;

export class OcrService {
  private worker: TesseractWorker | null = null;

  private tesseractModule: typeof import("tesseract.js") | null = null;

  private workerReady = false;

  private currentLanguage: string | null = null;

  getLanguages(): OcrLanguageOption[] {
    return OCR_LANGUAGE_OPTIONS;
  }

  private getWorkerScriptPath(): string {
    return app.isPackaged
      ? path.join(app.getAppPath(), "resources", "ocr", "tesseract-node-worker.cjs")
      : path.join(app.getAppPath(), "resources", "ocr", "tesseract-node-worker.cjs");
  }

  private async ensureWorkerDirectories(): Promise<{ cachePath: string }> {
    const cachePath = path.join(app.getPath("userData"), "ocr-cache");
    await mkdir(cachePath, { recursive: true });
    return { cachePath };
  }

  private async getTesseractModule(): Promise<typeof import("tesseract.js")> {
    if (this.tesseractModule) {
      return this.tesseractModule;
    }

    const loadedModule = await import("tesseract.js");
    this.tesseractModule = (loadedModule.default ?? loadedModule) as typeof import("tesseract.js");
    return this.tesseractModule;
  }

  private async ensureWorker(language: string): Promise<TesseractWorker> {
    if (!this.worker) {
      const Tesseract = await this.getTesseractModule();
      const { cachePath } = await this.ensureWorkerDirectories();
      this.worker = Tesseract.createWorker({
        workerPath: this.getWorkerScriptPath(),
        cachePath,
        cacheMethod: "write",
        logger: () => undefined
      });
    }

    if (!this.workerReady) {
      await this.worker.load();
      this.workerReady = true;
    }

    if (this.currentLanguage !== language) {
      await this.worker.loadLanguage(language);
      await this.worker.initialize(language);
      await this.worker.setParameters({
        preserve_interword_spaces: "1"
      });
      this.currentLanguage = language;
    }

    return this.worker;
  }

  async recognizeStep(input: RecognizeStepTextInput): Promise<OcrRecognitionResult | null> {
    const step = input.project.steps.find((candidate) => candidate.id === input.stepId);
    if (!step?.asset?.absolutePath) {
      return null;
    }

    const metadata = await sharp(step.asset.absolutePath).metadata();
    const imageWidth = metadata.width ?? step.asset.width;
    const imageHeight = metadata.height ?? step.asset.height;
    let pipeline = sharp(step.asset.absolutePath);
    let workingWidth = imageWidth;
    let workingHeight = imageHeight;

    if (input.selection && imageWidth > 0 && imageHeight > 0) {
      const left = Math.max(0, Math.min(imageWidth - 1, Math.floor(input.selection.x * imageWidth)));
      const top = Math.max(0, Math.min(imageHeight - 1, Math.floor(input.selection.y * imageHeight)));
      const width = Math.max(
        1,
        Math.min(imageWidth - left, Math.round(input.selection.width * imageWidth))
      );
      const height = Math.max(
        1,
        Math.min(imageHeight - top, Math.round(input.selection.height * imageHeight))
      );

      pipeline = pipeline.extract({ left, top, width, height });
      workingWidth = width;
      workingHeight = height;
    }

    const longestSide = Math.max(workingWidth, workingHeight);
    if (longestSide > OCR_MAX_DIMENSION) {
      pipeline = pipeline.resize({
        width: workingWidth >= workingHeight ? OCR_MAX_DIMENSION : undefined,
        height: workingHeight > workingWidth ? OCR_MAX_DIMENSION : undefined,
        fit: "inside",
        withoutEnlargement: true
      });
    } else if (input.selection && longestSide > 0 && longestSide < OCR_MIN_SELECTION_DIMENSION) {
      const scale = OCR_MIN_SELECTION_DIMENSION / longestSide;
      pipeline = pipeline.resize({
        width: Math.round(workingWidth * scale),
        height: Math.round(workingHeight * scale),
        fit: "fill"
      });
    }

    const recognitionSource = await pipeline
      .flatten({ background: "#ffffff" })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();

    const worker = await this.ensureWorker(input.language);
    const result = await worker.recognize(recognitionSource);
    const text = result.data.text.trim();

    return {
      stepId: input.stepId,
      language: input.language,
      text,
      confidence: Number.isFinite(result.data.confidence) ? result.data.confidence : null,
      lines: result.data.lines.map((line) => line.text.trim()).filter(Boolean),
      selection: input.selection ?? null
    };
  }

  async terminate(): Promise<void> {
    if (!this.worker) {
      return;
    }

    await this.worker.terminate();
    this.worker = null;
    this.workerReady = false;
    this.currentLanguage = null;
  }
}
