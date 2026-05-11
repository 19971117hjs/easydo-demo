import { ipcMain } from "electron";
import { ProjectService } from "@main/services/project.service";
import { OcrService } from "@main/services/ocr.service";
import type {
  CreateFolderInput,
  CreateProjectInput,
  DeleteFolderInput,
  DeleteProjectsInput,
  DuplicateProjectInput,
  MoveProjectsInput,
  RenameFolderInput,
  SaveProjectInput,
  UpdateProjectMetaInput
} from "@shared/contracts";

export function registerProjectIpc(projectService: ProjectService, ocrService: OcrService): void {
  ipcMain.handle("projects:get-library", () => projectService.getLibrary());
  ipcMain.handle("projects:load", (_event, id: string) => projectService.load(id));
  ipcMain.handle("projects:create-empty", (_event, input?: CreateProjectInput) =>
    projectService.createEmpty(input)
  );
  ipcMain.handle("projects:save", (_event, input: SaveProjectInput) =>
    projectService.save(input)
  );
  ipcMain.handle("projects:update-meta", (_event, input: UpdateProjectMetaInput) =>
    projectService.updateMeta(input)
  );
  ipcMain.handle("projects:duplicate", (_event, input: DuplicateProjectInput) =>
    projectService.duplicate(input)
  );
  ipcMain.handle("projects:delete-many", (_event, input: DeleteProjectsInput) =>
    projectService.deleteMany(input)
  );
  ipcMain.handle("projects:move-many", (_event, input: MoveProjectsInput) =>
    projectService.moveMany(input)
  );
  ipcMain.handle("projects:import-images", (_event, input) =>
    projectService.importImages(input)
  );
  ipcMain.handle("projects:import-annotation-asset", (_event, input) =>
    projectService.importAnnotationAsset(input)
  );
  ipcMain.handle("projects:get-ocr-languages", () => ocrService.getLanguages());
  ipcMain.handle("projects:recognize-step-text", (_event, input) =>
    ocrService.recognizeStep(input)
  );
  ipcMain.handle("projects:crop-step-asset", (_event, input) =>
    projectService.cropStepAsset(input)
  );
  ipcMain.handle("projects:restore-step-asset", (_event, input) =>
    projectService.restoreStepAsset(input)
  );
  ipcMain.handle("projects:create-folder", (_event, input: CreateFolderInput) =>
    projectService.createFolder(input)
  );
  ipcMain.handle("projects:rename-folder", (_event, input: RenameFolderInput) =>
    projectService.renameFolder(input)
  );
  ipcMain.handle("projects:delete-folder", (_event, input: DeleteFolderInput) =>
    projectService.deleteFolder(input)
  );
}
