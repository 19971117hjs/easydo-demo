import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "@renderer/views/HomeView.vue";
import RecorderView from "@renderer/views/RecorderView.vue";
import EditorView from "@renderer/views/EditorView.vue";
import CaptureOverlayView from "@renderer/views/CaptureOverlayView.vue";
import CaptureControlsView from "@renderer/views/CaptureControlsView.vue";

type AppLayout = "shell" | "overlay";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView
    },
    {
      path: "/recorder",
      name: "recorder",
      component: RecorderView,
      meta: {
        layout: "shell" satisfies AppLayout
      }
    },
    {
      path: "/editor",
      name: "editor",
      component: EditorView
    },
    {
      path: "/capture-overlay",
      name: "capture-overlay",
      component: CaptureOverlayView,
      meta: {
        layout: "overlay" satisfies AppLayout
      }
    },
    {
      path: "/capture-controls",
      name: "capture-controls",
      component: CaptureControlsView,
      meta: {
        layout: "overlay" satisfies AppLayout
      }
    }
  ]
});
