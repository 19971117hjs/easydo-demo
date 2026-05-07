<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useWorkbenchStore } from "@renderer/stores/workbench";

const route = useRoute();
const workbench = useWorkbenchStore();

const navItems = [
  { to: "/recorder", label: "Recorder", hint: "Parity pass" },
  { to: "/", label: "Library", hint: "Guides" },
  { to: "/editor", label: "Editor", hint: "Authoring" }
];

const captureLabel = computed(() => workbench.captureState?.status ?? "idle");
const appMeta = computed(() =>
  workbench.appOverview ? `${workbench.appOverview.platform} · v${workbench.appOverview.version}` : "Preparing workspace"
);
</script>

<template>
  <div class="shell">
    <aside class="shell__sidebar">
      <div class="shell__chrome">
        <button class="shell__menu" type="button">☰ Menu</button>
        <div class="shell__avatar">AO</div>
      </div>

      <div class="shell__brand">
        <span class="app-eyebrow">Recorder Rebuild</span>
        <h1>easyDo</h1>
        <p>Use Recorder as the parity checkpoint before the rest of the product gets rebuilt.</p>
      </div>

      <nav class="shell__nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          class="shell__nav-link"
          :class="{ 'shell__nav-link--active': route.path === item.to }"
          :to="item.to"
        >
          <strong>{{ item.label }}</strong>
          <span>{{ item.hint }}</span>
        </RouterLink>
      </nav>

      <div class="shell__status">
        <div class="app-chip app-chip--accent">
          <span class="app-chip__label">Capture</span>
          <span>{{ captureLabel }}</span>
        </div>
        <p>{{ appMeta }}</p>
      </div>
    </aside>

    <main class="shell__content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 228px minmax(0, 1fr);
  min-height: 100vh;
  background: transparent;
}

.shell__sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 14px 16px;
  background: rgba(34, 39, 34, 0.94);
  color: #f8f5ef;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.shell__chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
}

.shell__menu {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
  font-weight: 500;
  cursor: pointer;
}

.shell__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #f5c94c;
  color: #ffffff;
  font-weight: 700;
}

.shell__brand {
  padding: 8px 2px 0;
}

.shell__brand h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 0.94;
}

.shell__brand p {
  margin: 10px 0 0;
  color: rgba(247, 244, 234, 0.68);
  line-height: 1.6;
  font-size: 0.95rem;
}

.shell__nav {
  display: grid;
  gap: 8px;
  padding: 10px 0 0;
}

.shell__nav-link {
  display: grid;
  gap: 4px;
  padding: 14px 14px;
  border: 1px solid rgba(247, 243, 234, 0.08);
  border-radius: 12px;
  color: #f7f3ea;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.03);
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}

.shell__nav-link strong {
  font-size: 1rem;
}

.shell__nav-link span {
  color: rgba(247, 243, 234, 0.6);
  font-size: 0.84rem;
}

.shell__nav-link:hover,
.shell__nav-link--active {
  transform: translateX(1px);
  border-color: rgba(83, 182, 111, 0.45);
  background: rgba(83, 182, 111, 0.12);
}

.shell__status {
  margin-top: auto;
  display: grid;
  gap: 14px;
  padding: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.shell__status p {
  margin: 0;
  color: rgba(247, 243, 234, 0.68);
  line-height: 1.6;
}

.shell__content {
  min-width: 0;
  min-height: 100vh;
}

@media (max-width: 960px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .shell__sidebar {
    padding-bottom: 18px;
  }
}
</style>
