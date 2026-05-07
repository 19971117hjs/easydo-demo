<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { TextBlockTone } from "@shared/contracts";
import {
  createTextBlockHtml,
  LEGACY_TEXTBLOCK_CSS,
  TEXT_BLOCK_PRESETS
} from "@shared/legacy-textblocks";

type TinyEditor = {
  destroy: () => void;
  getContent: () => string;
  setContent: (value: string) => void;
  insertContent: (value: string) => void;
  selection: {
    setCursorLocation: () => void;
  };
};

type TinyMceGlobal = {
  init: (config: Record<string, unknown>) => Promise<TinyEditor[]>;
  get: (id: string) => TinyEditor | null;
  remove: (editor: TinyEditor) => void;
};

declare global {
  interface Window {
    tinymce?: TinyMceGlobal;
  }
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
  }>(),
  {
    placeholder: "Write the operator guidance, checks, and expected result..."
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const elementId = `easydo-tinymce-${Math.random().toString(36).slice(2, 8)}`;
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const editorRef = ref<TinyEditor | null>(null);
const isLoading = ref(true);
const loadError = ref("");

const textBlockPresets = computed(() => TEXT_BLOCK_PRESETS);

let scriptPromise: Promise<void> | null = null;

function loadTinymceScript(): Promise<void> {
  if (window.tinymce) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-easydo-tinymce="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load TinyMCE.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "/folge-legacy/tinymce/tinymce.min.js";
    script.dataset.easydoTinymce = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load TinyMCE."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function initEditor(): Promise<void> {
  await loadTinymceScript();

  const tinymce = window.tinymce;
  if (!tinymce || !textareaRef.value) {
    throw new Error("TinyMCE is unavailable.");
  }

  const editors = await tinymce.init({
    target: textareaRef.value,
    promotion: false,
    branding: false,
    menubar: false,
    statusbar: false,
    resize: true,
    min_height: 320,
    plugins: [
      "lists",
      "link",
      "table",
      "code",
      "preview",
      "searchreplace",
      "autoresize",
      "quickbars",
      "visualblocks",
      "wordcount"
    ].join(" "),
    toolbar:
      "undo redo | blocks | bold italic underline | bullist numlist | link table | searchreplace visualblocks code preview",
    quickbars_selection_toolbar: "bold italic underline | bullist numlist | quicklink blockquote",
    block_formats: "Paragraph=p; Heading 3=h3; Heading 4=h4; Quote=blockquote",
    content_css: false,
    content_style: `
      body {
        font-family: "Avenir Next", "PingFang SC", sans-serif;
        font-size: 15px;
        line-height: 1.75;
        color: #1f2c37;
        padding: 10px;
      }
      p { margin: 0 0 0.75rem; }
      h3, h4 { margin: 1.1rem 0 0.5rem; }
      blockquote {
        margin: 1rem 0;
        padding: 0.75rem 1rem;
        border-left: 4px solid #d77a2a;
        background: #f9f3ea;
      }
      img { max-width: 100%; }
      ${LEGACY_TEXTBLOCK_CSS}
    `,
    placeholder: props.placeholder,
    setup: (editor: TinyEditor & { on: (name: string, callback: () => void) => void }) => {
      editor.on("init", () => {
        editor.setContent(props.modelValue || "<p></p>");
        editorRef.value = editor;
        isLoading.value = false;
      });
      editor.on("change", () => {
        emit("update:modelValue", editor.getContent());
      });
      editor.on("input", () => {
        emit("update:modelValue", editor.getContent());
      });
      editor.on("undo", () => {
        emit("update:modelValue", editor.getContent());
      });
      editor.on("redo", () => {
        emit("update:modelValue", editor.getContent());
      });
    }
  });

  editorRef.value = editors[0] ?? null;
}

function insertTextBlock(tone: TextBlockTone): void {
  editorRef.value?.insertContent(createTextBlockHtml(tone));
  emit("update:modelValue", editorRef.value?.getContent() ?? props.modelValue);
}

watch(
  () => props.modelValue,
  (value) => {
    const editor = editorRef.value;
    if (!editor) {
      return;
    }

    if (editor.getContent() !== value) {
      editor.setContent(value || "<p></p>");
      editor.selection.setCursorLocation();
    }
  }
);

onMounted(async () => {
  try {
    await initEditor();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
    isLoading.value = false;
  }
});

onBeforeUnmount(() => {
  if (window.tinymce && editorRef.value) {
    window.tinymce.remove(editorRef.value);
  }
  editorRef.value = null;
});
</script>

<template>
  <div class="rich-editor">
    <div class="rich-editor__toolbar">
      <span>Text Blocks</span>
      <button
        v-for="preset in textBlockPresets"
        :key="preset.tone"
        type="button"
        @click="insertTextBlock(preset.tone)"
      >
        {{ preset.label }}
      </button>
    </div>

    <div v-if="isLoading" class="rich-editor__fallback">Loading Folge-style editor...</div>
    <div v-else-if="loadError" class="rich-editor__fallback rich-editor__fallback--error">
      {{ loadError }}
    </div>
    <textarea :id="elementId" ref="textareaRef"></textarea>
  </div>
</template>

<style scoped>
.rich-editor {
  display: grid;
  gap: 10px;
}

.rich-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.rich-editor__toolbar span {
  color: #5e6a74;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.rich-editor__toolbar button {
  border: 1px solid rgba(31, 44, 55, 0.12);
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.82);
  color: #31404b;
  cursor: pointer;
}

.rich-editor__fallback {
  padding: 14px 16px;
  border-radius: 18px;
  background: #f8f2e7;
  color: #5e6a74;
}

.rich-editor__fallback--error {
  color: #a14a42;
}

textarea {
  visibility: hidden;
  height: 0;
}
</style>
