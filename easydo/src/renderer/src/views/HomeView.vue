<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { ProjectSummary } from "@shared/contracts";
import { useWorkbenchStore } from "@renderer/stores/workbench";

const router = useRouter();
const workbench = useWorkbenchStore();

const menuOpen = ref(false);
const actionMenuGuideId = ref<string | null>(null);

const guides = computed(() => workbench.visibleProjects);
const selectedIds = computed(() => workbench.selectedGuideIds);
const folders = computed(() => workbench.folders);
const allVisibleSelected = computed(
  () => guides.value.length > 0 && guides.value.every((guide) => selectedIds.value.includes(guide.id))
);
const hasSelection = computed(() => selectedIds.value.length > 0);
const hasGuides = computed(() => guides.value.length > 0);
const titleSortDescending = computed(() => workbench.guideSortMode === "name-desc");
const updatedSortAscending = computed(() => workbench.guideSortMode === "updated-asc");
const createdSortAscending = computed(() => workbench.guideSortMode === "created-asc");
const appVersionLabel = computed(() => workbench.appOverview?.version ?? "1.24.2");

function closeMenu(): void {
  menuOpen.value = false;
}

function formatRelativeDate(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    return "just now";
  }
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

async function openGuide(id: string): Promise<void> {
  actionMenuGuideId.value = null;
  await workbench.loadProject(id);
  await router.push("/editor");
}

async function createGuide(): Promise<void> {
  await workbench.createProject({ persist: true });
  await router.push("/editor");
}

async function backupGuides(): Promise<void> {
  window.alert("Backup flow will be wired to Folge-compatible .flgg export next.");
}

async function restoreGuides(): Promise<void> {
  window.alert("Restore flow will be wired to Folge-compatible .flgg import next.");
}

function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

function openMail(address: string): void {
  window.open(`mailto:${address}`, "_blank");
}

function showSettings(): void {
  window.alert("Settings panel will be wired in the next parity pass.");
}

function checkUpdates(): void {
  window.alert("Update check flow will be wired in the next parity pass.");
}

async function createFolder(): Promise<void> {
  const name = window.prompt("New folder name", "New Folder");
  if (!name) {
    return;
  }
  await workbench.createFolder(name);
}

function toggleSelectAllVisible(): void {
  if (allVisibleSelected.value) {
    workbench.clearGuideSelection();
    return;
  }

  workbench.selectAllVisibleGuides();
}

async function renameGuide(guide: ProjectSummary): Promise<void> {
  const nextName = window.prompt("Rename guide", guide.name);
  if (!nextName || nextName.trim() === guide.name) {
    return;
  }
  await workbench.renameProject(guide.id, nextName);
  actionMenuGuideId.value = null;
}

async function duplicateGuide(guide: ProjectSummary): Promise<void> {
  await workbench.duplicateProject(guide.id);
  actionMenuGuideId.value = null;
}

async function deleteGuide(guide: ProjectSummary): Promise<void> {
  if (!window.confirm(`Delete "${guide.name}"?`)) {
    return;
  }
  await workbench.deleteProjects([guide.id]);
  actionMenuGuideId.value = null;
}

async function moveGuide(guide: ProjectSummary): Promise<void> {
  const folderName = window.prompt(
    "Move guide to folder. Leave empty to remove from folder.\n\nExisting folders:\n" +
      folders.value.map((folder) => `- ${folder.name}`).join("\n"),
    guide.folderName ?? ""
  );
  if (folderName === null) {
    return;
  }
  const trimmed = folderName.trim();
  if (!trimmed) {
    await workbench.moveProjectsToFolder([guide.id], null);
    actionMenuGuideId.value = null;
    return;
  }
  const existing = folders.value.find((folder) => folder.name === trimmed);
  const targetFolder = existing ?? (await workbench.createFolder(trimmed));
  if (!targetFolder) {
    return;
  }
  await workbench.moveProjectsToFolder([guide.id], targetFolder.id);
  actionMenuGuideId.value = null;
}

async function toggleFavorite(guide: ProjectSummary): Promise<void> {
  await workbench.toggleProjectFavorite(guide.id);
}

function toggleTitleSort(): void {
  workbench.setGuideSortMode(titleSortDescending.value ? "name-asc" : "name-desc");
}

function toggleUpdatedSort(): void {
  workbench.setGuideSortMode(updatedSortAscending.value ? "updated-desc" : "updated-asc");
}

function toggleCreatedSort(): void {
  workbench.setGuideSortMode(createdSortAscending.value ? "created-desc" : "created-asc");
}

async function moveSelectedGuides(): Promise<void> {
  if (!selectedIds.value.length) {
    return;
  }

  const folderName = window.prompt(
    "Move selected guides to folder. Leave empty to remove from folder.\n\nExisting folders:\n" +
      folders.value.map((folder) => `- ${folder.name}`).join("\n"),
    ""
  );
  if (folderName === null) {
    return;
  }

  const trimmed = folderName.trim();
  if (!trimmed) {
    await workbench.moveProjectsToFolder(selectedIds.value, null);
    workbench.clearGuideSelection();
    return;
  }

  const existing = folders.value.find((folder) => folder.name === trimmed);
  const targetFolder = existing ?? (await workbench.createFolder(trimmed));
  if (!targetFolder) {
    return;
  }

  await workbench.moveProjectsToFolder(selectedIds.value, targetFolder.id);
  workbench.clearGuideSelection();
}

async function deleteSelectedGuides(): Promise<void> {
  if (!selectedIds.value.length) {
    return;
  }

  if (!window.confirm(`Delete ${selectedIds.value.length} selected guide(s)?`)) {
    return;
  }

  await workbench.deleteProjects(selectedIds.value);
}

onMounted(async () => {
  await workbench.bootstrap();
  await workbench.refreshLibrary();
});
</script>

<template>
  <section class="home-page" @click="menuOpen = false; actionMenuGuideId = null">
    <header class="toolbar">
      <button class="menu-button" type="button" @click.stop="menuOpen = !menuOpen">☰ Menu</button>

      <div class="toolbar__avatar">AO</div>
    </header>

    <div v-if="menuOpen" class="menu-overlay" @click="closeMenu">
      <aside class="side-menu" @click.stop>
        <button class="side-menu__close" type="button" @click="closeMenu">×</button>

        <div class="side-menu__group">
          <button class="side-menu__item" type="button" @click="showSettings">Settings</button>
        </div>

        <div class="side-menu__group">
          <button class="side-menu__item side-menu__item--highlight" type="button" @click="openExternal('https://folge.me/go/roadmap')">
            Suggest a feature
          </button>
          <button class="side-menu__item" type="button" @click="openExternal('https://help.folge.me/')">
            Online Help
          </button>
        </div>

        <div class="side-menu__group">
          <button class="side-menu__item" type="button" @click="checkUpdates">Check for updates</button>
          <button class="side-menu__item" type="button" @click="openMail('hello@folge.me')">Support - hello@folge.me</button>
          <div class="side-menu__version">Version: {{ appVersionLabel }}</div>
        </div>
      </aside>
    </div>

    <main class="content">
      <section class="action-cards">
        <button class="action-card action-card--primary" type="button" @click="createGuide">
          <span class="action-card__icon">⊕</span>
          <span class="action-card__copy">
            <strong>Create Guide</strong>
            <small>Start capturing your workflows</small>
          </span>
        </button>

        <button class="action-card" type="button" @click="backupGuides">
          <span class="action-card__icon">⇥</span>
          <span class="action-card__copy">
            <strong>Backup</strong>
            <small>Backup guide(s) into .flgg files</small>
          </span>
          <span class="action-card__tail">↓</span>
        </button>

        <button class="action-card" type="button" @click="restoreGuides">
          <span class="action-card__icon">⇤</span>
          <span class="action-card__copy">
            <strong>Restore</strong>
            <small>Restore backuped guide(s) from .flgg files</small>
          </span>
        </button>
      </section>

      <section class="guides-panel">
        <div class="guides-panel__header">
          <strong>Your Guides</strong>

          <div class="guides-panel__controls">
            <button class="folder-button" type="button" @click.stop="createFolder">
              <span>⊞</span>
              <span>New Folder</span>
            </button>

            <label class="search-box">
              <span>⌕</span>
              <input
                :value="workbench.guideSearch"
                type="search"
                placeholder="Search..."
                @input="workbench.setGuideSearch(($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </div>

        <div v-if="hasSelection" class="selection-bar">
          <span>{{ selectedIds.length }} selected</span>
          <button type="button" @click="moveSelectedGuides">Move</button>
          <button type="button" @click="deleteSelectedGuides">Delete</button>
          <button type="button" @click="workbench.clearGuideSelection()">Clear</button>
        </div>

        <div class="guides-table">
          <div class="guides-table__head">
            <label class="col-select">
              <input type="checkbox" :checked="allVisibleSelected" @change.stop="toggleSelectAllVisible" />
            </label>
            <span class="col-favorite"></span>
            <button class="col-title col-button" type="button" @click="toggleTitleSort">
              Title <em>{{ titleSortDescending ? "↓" : "↑" }}</em>
            </button>
            <span class="col-steps"></span>
            <button class="col-updated col-button" type="button" @click="toggleUpdatedSort">
              Updated <em>{{ updatedSortAscending ? "↑" : "↓" }}</em>
            </button>
            <button class="col-created col-button" type="button" @click="toggleCreatedSort">
              Created <em>{{ createdSortAscending ? "↑" : "↓" }}</em>
            </button>
            <span class="col-actions"></span>
          </div>

          <div v-if="hasGuides" class="guides-table__body">
            <article v-for="guide in guides" :key="guide.id" class="guide-row">
              <label class="guide-row__check">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(guide.id)"
                  @change.stop="workbench.toggleGuideSelection(guide.id)"
                />
              </label>

              <button class="guide-row__favorite" type="button" @click.stop="toggleFavorite(guide)">
                {{ guide.isFavorited ? "★" : "☆" }}
              </button>

              <button class="guide-row__title" type="button" @click="openGuide(guide.id)">
                {{ guide.name || "Untitled" }}
              </button>

              <div class="guide-row__steps">
                <span class="guide-row__steps-icon">📄</span>
                <span>{{ guide.stepCount }}</span>
              </div>

              <span class="guide-row__updated">{{ formatRelativeDate(guide.updatedAt) }}</span>
              <span class="guide-row__created">{{ formatRelativeDate(guide.createdAt) }}</span>

              <div class="guide-row__actions">
                <button
                  class="more-button"
                  type="button"
                  @click.stop="actionMenuGuideId = actionMenuGuideId === guide.id ? null : guide.id"
                >
                  •••
                </button>

                <div v-if="actionMenuGuideId === guide.id" class="row-menu" @click.stop>
                  <button type="button" @click="renameGuide(guide)">Rename</button>
                  <button type="button" @click="duplicateGuide(guide)">Duplicate</button>
                  <button type="button" @click="moveGuide(guide)">Move</button>
                  <button class="row-menu__danger" type="button" @click="deleteGuide(guide)">Delete</button>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">
            <strong>No guides yet</strong>
            <p>Create your first guide to start capturing workflows in the rebuilt Folge-style library.</p>
          </div>
        </div>
      </section>

      <div class="help-fab">?</div>
    </main>
  </section>
</template>

<style scoped>
.home-page {
  height: 100vh;
  display: grid;
  grid-template-rows: 40px minmax(0, 1fr);
  background: #ffffff;
  color: #222730;
  overflow: hidden;
}

.toolbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid #e6e6e6;
  background: #ffffff;
}

.menu-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: #30353c;
  font-size: 0.95rem;
  font-weight: 500;
}

.toolbar__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #f6c84a;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
}

.menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(255, 255, 255, 0.12);
}

.side-menu {
  width: 247px;
  height: 100%;
  background: #f6f8fb;
  border-right: 1px solid #dfe4ea;
  display: grid;
  grid-template-rows: 54px auto auto auto 1fr;
}

.side-menu__close {
  justify-self: end;
  width: 44px;
  height: 44px;
  margin: 0 2px 0 0;
  border: none;
  background: transparent;
  color: #9da5ae;
  font-size: 1.8rem;
  line-height: 1;
}

.side-menu__group {
  border-top: 1px solid #dde3ea;
  padding: 0;
}

.side-menu__item {
  width: 100%;
  min-height: 52px;
  padding: 0 14px;
  border: none;
  background: transparent;
  color: #1f2731;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  font-size: 0.94rem;
}

.side-menu__item--highlight {
  background: #ffd54d;
}

.side-menu__version {
  padding: 10px 14px 0;
  color: #26303a;
  font-size: 0.9rem;
}

.content {
  position: relative;
  min-height: 0;
  padding: 16px 16px 20px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  overflow: hidden;
}

.action-cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 26px;
  max-width: 740px;
  margin: 0 auto;
}

.action-card {
  min-height: 62px;
  padding: 0 14px;
  border: 1px solid #d6dbe2;
  border-radius: 6px;
  background: #ffffff;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  text-align: left;
}

.action-card--primary {
  border-color: #54bb6f;
}

.action-card__icon {
  color: #29313b;
  font-size: 1.05rem;
}

.action-card--primary .action-card__icon {
  color: #35b256;
}

.action-card__copy strong,
.action-card__copy small {
  display: block;
}

.action-card__copy strong {
  font-size: 0.98rem;
  font-weight: 700;
}

.action-card__copy small {
  margin-top: 2px;
  color: #49515a;
  font-size: 0.72rem;
  line-height: 1.35;
}

.action-card__tail {
  color: #232a32;
  font-size: 1rem;
}

.guides-panel {
  min-height: 0;
  border-top: 1px solid #e1e6eb;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding-top: 14px;
}

.guides-panel__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 0 2px 16px;
}

.guides-panel__header strong {
  font-size: 1rem;
}

.selection-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 2px 14px;
  color: #53606d;
  font-size: 0.82rem;
}

.selection-bar button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d7dde5;
  border-radius: 6px;
  background: #ffffff;
  color: #2f3741;
  font: inherit;
}

.guides-panel__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.folder-button {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #303842;
  border-radius: 4px;
  background: #ffffff;
  color: #303842;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: inherit;
}

.search-box {
  width: 190px;
  height: 30px;
  padding: 0 9px;
  border: 1px solid #303842;
  border-radius: 4px;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #303842;
}

.search-box input {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
}

.guides-table {
  min-height: 0;
  display: grid;
  grid-template-rows: 34px minmax(0, 1fr);
}

.guides-table__head,
.guide-row {
  display: grid;
  grid-template-columns: 34px 34px minmax(320px, 1fr) 90px 190px 190px 56px;
  align-items: center;
}

.guides-table__head {
  min-height: 34px;
  color: #6a7380;
  font-size: 0.8rem;
  background: #f1f2f4;
  border-radius: 2px;
}

.col-button {
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
}

.col-select,
.col-favorite {
  display: grid;
  place-items: center;
}

.col-select input {
  width: 19px;
  height: 19px;
}

.col-title {
  padding-left: 6px;
}

.col-title em,
.col-updated em,
.col-created em {
  font-style: normal;
  margin-left: 10px;
  font-size: 1.1rem;
  color: #627081;
}

.guides-table__body {
  min-height: 0;
  overflow: auto;
}

.guide-row {
  min-height: 46px;
  padding: 0;
  border-bottom: 1px solid #f0f2f5;
}

.guide-row__check {
  display: grid;
  place-items: center;
}

.guide-row input[type="checkbox"] {
  width: 19px;
  height: 19px;
}

.guide-row__favorite {
  border: none;
  background: transparent;
  color: #1c2530;
  font-size: 1.15rem;
  text-align: center;
}

.guide-row__title {
  border: none;
  background: transparent;
  color: #0b66ff;
  text-align: left;
  font-size: 0.98rem;
  font-weight: 600;
}

.guide-row__steps {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #2f3741;
}

.guide-row__steps-icon {
  font-size: 0.92rem;
}

.guide-row__updated,
.guide-row__created {
  color: #2b3139;
  font-size: 0.94rem;
}

.guide-row__actions {
  position: relative;
  display: flex;
  justify-content: center;
}

.selection-bar button:hover,
.col-button:hover,
.folder-button:hover,
.more-button:hover {
  opacity: 0.82;
}

.more-button {
  width: 34px;
  height: 28px;
  border: 1px solid #28313b;
  border-radius: 6px;
  background: #ffffff;
  color: #28313b;
  font-size: 0.95rem;
}

.row-menu {
  position: absolute;
  right: 0;
  top: 34px;
  z-index: 10;
  display: grid;
  gap: 4px;
  min-width: 112px;
  padding: 6px;
  border: 1px solid #d8dde3;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(17, 24, 32, 0.08);
}

.row-menu button {
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  font: inherit;
  color: #26303a;
}

.row-menu button:hover {
  background: #f5f7fa;
}

.row-menu__danger {
  color: #c43b3b !important;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 10px;
  padding: 80px 20px;
  text-align: center;
  color: #617080;
}

.empty-state p {
  margin: 0;
}

.help-fab {
  position: absolute;
  right: 14px;
  bottom: 14px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #000000;
  color: #ffffff;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .action-cards {
    grid-template-columns: 1fr;
    max-width: 540px;
  }

  .guides-panel__header {
    grid-template-columns: 1fr;
  }

  .guides-table__head,
  .guide-row {
    grid-template-columns: 34px 34px minmax(220px, 1fr) 82px 140px 140px 56px;
  }
}
</style>
