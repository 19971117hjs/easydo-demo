<script setup lang="ts">
import RecorderActivityPanel from "@renderer/features/recorder/components/RecorderActivityPanel.vue";
import RecorderControlPanel from "@renderer/features/recorder/components/RecorderControlPanel.vue";
import RecorderHero from "@renderer/features/recorder/components/RecorderHero.vue";
import RecorderPermissionPanel from "@renderer/features/recorder/components/RecorderPermissionPanel.vue";
import RecorderPreviewPanel from "@renderer/features/recorder/components/RecorderPreviewPanel.vue";
import { useRecorderWorkspace } from "@renderer/features/recorder/useRecorderWorkspace";

const recorder = useRecorderWorkspace();
const {
  actionPending,
  activityMessage,
  activityMetrics,
  canCaptureNow,
  canPauseSession,
  canStartClickStream,
  canStartSession,
  canStopSession,
  captureNotes,
  captureTitle,
  checkedAtLabel,
  clickStreamActive,
  guideMeta,
  guideName,
  heroBadges,
  isBootstrapping,
  latestCapture,
  permissionItems,
  permissionNotes,
  statusNarrative
} = recorder;
</script>

<template>
  <section class="recorder-page">
    <RecorderHero
      :app-version="recorder.workbench.appOverview?.version ? `easyDo v${recorder.workbench.appOverview.version}` : 'Preparing app overview'"
      :badges="heroBadges"
      :guide-meta="guideMeta"
      :guide-name="guideName"
      :summary="statusNarrative"
    />

    <div class="recorder-layout">
      <div class="recorder-layout__main">
        <RecorderControlPanel
          v-model:notes="captureNotes"
          v-model:title="captureTitle"
          :action-pending="actionPending || isBootstrapping"
          :can-capture-now="canCaptureNow"
          :can-pause-session="canPauseSession"
          :can-start-click-stream="canStartClickStream"
          :can-start-session="canStartSession"
          :can-stop-session="canStopSession"
          :click-stream-active="clickStreamActive"
          @capture-screen="recorder.captureCurrentScreen"
          @pause-recording="recorder.pauseRecording"
          @refresh-permissions="recorder.refreshPermissions"
          @select-area="recorder.selectArea"
          @start-click-stream="recorder.startClickStream"
          @start-recording="recorder.startRecording"
          @stop-click-stream="recorder.stopClickStream"
          @stop-recording="recorder.stopRecording"
        />

        <RecorderActivityPanel
          :click-stream-active="clickStreamActive"
          :error-message="activityMessage"
          :metrics="activityMetrics"
          :narrative="statusNarrative"
        />
      </div>

      <div class="recorder-layout__side">
        <RecorderPermissionPanel
          :checked-at="checkedAtLabel"
          :items="permissionItems"
          :notes="permissionNotes"
        />

        <RecorderPreviewPanel :preview="latestCapture" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.recorder-page {
  min-height: 100vh;
  padding: 18px 20px;
  display: grid;
  gap: var(--space-6);
  background: transparent;
}

.recorder-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: var(--space-6);
  min-height: 0;
}

.recorder-layout__main,
.recorder-layout__side {
  display: grid;
  gap: var(--space-6);
  align-content: start;
}

@media (max-width: 1200px) {
  .recorder-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .recorder-page {
    padding: 14px;
  }
}
</style>
