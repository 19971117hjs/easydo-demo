const fs = require("fs");
const os = require("os");
const path = require("path");
const { app, ipcMain } = require("electron");

const supportDir = path.join(os.homedir(), "Library", "Application Support");
const candidates = [
  path.join(supportDir, "Folge"),
  path.join(supportDir, "folge")
];

const userDataDir = candidates.find((dir) => fs.existsSync(dir)) || candidates[0];

const pendingPdfExports = new Map();

function normalizeFileRef(value) {
  if (!value) {
    return null;
  }

  try {
    if (String(value).startsWith("file://")) {
      let pathname = decodeURIComponent(new URL(String(value)).pathname);
      if (/^\/[A-Za-z]:\//.test(pathname)) {
        pathname = pathname.slice(1);
      }
      return path.resolve(pathname);
    }
  } catch (_error) {}

  return path.resolve(String(value));
}

ipcMain.on("generatePdf", (_event, payload = {}) => {
  const sourcePath = normalizeFileRef(payload.source);
  if (sourcePath) {
    pendingPdfExports.set(sourcePath, {
      requestedAt: Date.now(),
      destination: payload.destination || null
    });
  }

  console.log(
    "[folge-runtime] pdf-export-request",
    JSON.stringify({
      sourcePath,
      destination: payload.destination || null,
      landscape: !!payload.landscape,
      pdfPageSize: payload.pdfPageSize || null
    })
  );
});

app.setName("Folge");
app.setPath("userData", userDataDir);

const PATCH_LOCAL_EXPORT_FLAGS_SCRIPT = `
(() => {
  try {
    const rootEl = document.querySelector('#app');
    const vue = rootEl && rootEl.__vue__;
    const store = vue && vue.$store;
    if (!store || !store.state || !store.state['user-account'] || !store.state['user-account'].account) {
      return { ok: false, reason: 'user-account-not-found' };
    }
    const safe = (value) => JSON.parse(JSON.stringify(value));
    const account = store.state['user-account'].account;
    const flags = store.state['user-account'].flags || {};
    const before = {
      plan: store.getters['user-account/plan'],
      flags: store.getters['user-account/flags'],
      payload: account.signedPlan && account.signedPlan.payload,
      planDescriptor: Object.getOwnPropertyDescriptor(store.getters, 'user-account/plan'),
      flagsDescriptor: Object.getOwnPropertyDescriptor(store.getters, 'user-account/flags')
    };
    if (account.signedPlan && account.signedPlan.payload) {
      account.signedPlan.payload = JSON.stringify({
        name: 'pro',
        details: {
          guides: 9999,
          flagD: true,
          flagCS: true,
          flagFx: true,
          flagB: true
        },
        platform: '',
        isBusiness: false
      });
    }
    flags.guides = 9999;
    if (vue && typeof vue.$set === 'function') {
      vue.$set(flags, 'guides', 9999);
      vue.$set(flags, 'flagD', true);
      vue.$set(flags, 'flagCS', true);
      vue.$set(flags, 'flagFx', true);
      vue.$set(flags, 'flagB', true);
    } else {
      flags.flagD = true;
      flags.flagCS = true;
      flags.flagFx = true;
      flags.flagB = true;
    }
    store.state['user-account'].flags = flags;
    const after = {
      plan: store.getters['user-account/plan'],
      flags: store.getters['user-account/flags'],
      payload: account.signedPlan && account.signedPlan.payload
    };
    return {
      ok: true,
      before: safe(before),
      after: safe(after)
    };
  } catch (error) {
    return { ok: false, reason: String(error && error.stack || error) };
  }
})()
`;

const INSTALL_EXPORT_UNLOCK_PATCH_SCRIPT = `
(() => {
  try {
    const rootEl = document.querySelector('#app');
    const root = rootEl && rootEl.__vue__;
    if (!root) {
      return { ok: false, reason: 'root-not-found' };
    }
    if (window.__folgeUnlockPatchInstalled) {
      return { ok: true, alreadyInstalled: true };
    }
    const walk = (vm, visitor, seen = new Set(), depth = 0) => {
      if (!vm || seen.has(vm) || depth > 12) return;
      seen.add(vm);
      visitor(vm);
      (vm.$children || []).forEach((child) => walk(child, visitor, seen, depth + 1));
    };
    const forceNoWatermark = (value, seen = new Set(), depth = 0) => {
      if (!value || typeof value !== 'object' || seen.has(value) || depth > 8) {
        return 0;
      }
      seen.add(value);
      let patched = 0;
      if (Object.prototype.hasOwnProperty.call(value, 'addWatermark') && value.addWatermark !== false) {
        value.addWatermark = false;
        patched += 1;
      }
      Object.keys(value).forEach((key) => {
        try {
          patched += forceNoWatermark(value[key], seen, depth + 1);
        } catch (_error) {}
      });
      return patched;
    };
    const patch = () => {
      let patchedBadges = 0;
      let patchedExportSettings = 0;
      let patchedExportGuides = 0;
      let patchedWatermarkFlags = 0;
      try {
        if (root.$store) {
          patchedWatermarkFlags += forceNoWatermark(root.$store.state);
          if (root.$store._vm && root.$store._vm._data) {
            patchedWatermarkFlags += forceNoWatermark(root.$store._vm._data);
          }
        }
      } catch (_error) {}
      walk(root, (vm) => {
        const name = vm.$options && (vm.$options.name || vm.$options._componentTag || '');
        try {
          patchedWatermarkFlags += forceNoWatermark(vm.$data);
          patchedWatermarkFlags += forceNoWatermark(vm.$props);
          patchedWatermarkFlags += forceNoWatermark(vm.$refs);
          patchedWatermarkFlags += forceNoWatermark(vm);
        } catch (_error) {}
        if (name === 'UpsellBadge') {
          patchedBadges += 1;
          vm.skipLock = true;
          vm.isLocked = false;
          vm.onToggle = () => false;
          vm.showModal = () => false;
          if (vm.constructor && vm.constructor.options && vm.constructor.options.methods) {
            vm.constructor.options.methods.onToggle = () => false;
            vm.constructor.options.methods.showModal = () => false;
          }
          if (vm.$refs && vm.$refs.modal) {
            vm.$refs.modal.showModal = () => false;
            vm.$refs.modal.modalVisible = false;
          }
        }
        if (name === 'ExportSettings') {
          patchedExportSettings += 1;
          vm.isFree = false;
          if ('addWatermark' in vm) {
            vm.addWatermark = false;
          }
          if (vm.settings && typeof vm.settings === 'object') {
            vm.settings.addWatermark = false;
          }
          if (vm.exportSettings && typeof vm.exportSettings === 'object') {
            vm.exportSettings.addWatermark = false;
          }
          if (vm.$refs && vm.$refs.badge) {
            vm.$refs.badge.skipLock = true;
            vm.$refs.badge.isLocked = false;
            vm.$refs.badge.onToggle = () => false;
          }
        }
        if (name === 'ExportGuide') {
          patchedExportGuides += 1;
          if (vm.isBusy) {
            vm.isBusy = false;
          }
          if (!vm.__folgeGuideOnExportPatched && typeof vm.onExport === 'function') {
            vm.__folgeGuideOnExportPatched = true;
            const originalOnExport = vm.onExport.bind(vm);
            vm.onExport = async function(...args) {
              this.isBusy = false;
              try {
                const result = await originalOnExport(...args);
                return result;
              } finally {
                this.isBusy = false;
                setTimeout(() => {
                  try {
                    this.isBusy = false;
                  } catch (_error) {}
                }, 300);
              }
            };
          }
        }
      });
      window.__folgeUnlockPatchStats = {
        patchedBadges,
        patchedExportSettings,
        patchedExportGuides,
        patchedWatermarkFlags,
        hash: location.hash,
        time: Date.now()
      };
    };
    patch();
    window.__folgeUnlockPatchInstalled = setInterval(patch, 50);
    return { ok: true, installed: true, stats: window.__folgeUnlockPatchStats };
  } catch (error) {
    return { ok: false, reason: String(error && error.stack || error) };
  }
})()
`;

app.on("browser-window-created", (_event, win) => {
  let exportDiagnostics = null;
  const originalSend = win.webContents.send.bind(win.webContents);

  win.webContents.send = function patchedSend(channel, ...args) {
    try {
      return originalSend(channel, ...args);
    } catch (error) {
      const details = {
        windowId: win.id,
        channel,
        url: (() => {
          try {
            return win.webContents.getURL();
          } catch (_error) {
            return null;
          }
        })(),
        isWindowDestroyed: win.isDestroyed(),
        isWebContentsDestroyed: win.webContents.isDestroyed(),
        isLoadingMainFrame:
          typeof win.webContents.isLoadingMainFrame === "function"
            ? win.webContents.isLoadingMainFrame()
            : null,
        message: String(error && error.message || error),
        stack: String(error && error.stack || error)
      };

      console.log(
        "[folge-runtime] webcontents-send-error",
        JSON.stringify(details)
      );

      if (
        String(error && error.message || error).includes(
          "Render frame was disposed before WebFrameMain could be accessed"
        )
      ) {
        return false;
      }

      throw error;
    }
  };

  const maybeAttachExportDiagnostics = () => {
    const url = win.webContents.getURL();
    const urlPath = normalizeFileRef(url);
    if (!urlPath) {
      return;
    }

    const pending = pendingPdfExports.get(urlPath);
    if (!pending) {
      return;
    }

    if (!exportDiagnostics) {
      exportDiagnostics = {
        sourcePath: urlPath,
        requestedAt: pending.requestedAt
      };
      console.log(
        "[folge-runtime] pdf-export-window-detected",
        JSON.stringify({
          sourcePath: urlPath,
          windowId: win.id,
          sinceRequestMs: Date.now() - pending.requestedAt
        })
      );
    }
  };

  win.webContents.on("did-start-loading", () => {
    maybeAttachExportDiagnostics();
    if (exportDiagnostics) {
      console.log(
        "[folge-runtime] pdf-export-window-loading",
        JSON.stringify({
          sourcePath: exportDiagnostics.sourcePath,
          windowId: win.id
        })
      );
    }
  });

  win.webContents.on("did-finish-load", async () => {
    maybeAttachExportDiagnostics();
    if (exportDiagnostics) {
      console.log(
        "[folge-runtime] pdf-export-window-loaded",
        JSON.stringify({
          sourcePath: exportDiagnostics.sourcePath,
          windowId: win.id,
          loadMs: Date.now() - exportDiagnostics.requestedAt
        })
      );
    }

    try {
      const url = win.webContents.getURL();
      if (!url.startsWith("file://")) {
        return;
      }
      const patched = await win.webContents.executeJavaScript(PATCH_LOCAL_EXPORT_FLAGS_SCRIPT, true);
      console.log("[folge-runtime] local-export-flags", JSON.stringify({ url, patched }));
      const unlockPatch = await win.webContents.executeJavaScript(INSTALL_EXPORT_UNLOCK_PATCH_SCRIPT, true);
      console.log("[folge-runtime] export-unlock-patch", JSON.stringify({ url, unlockPatch }));
    } catch (error) {
      console.log("[folge-runtime] local-export-flags-error", String(error && error.stack || error));
    }
  });

  win.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      maybeAttachExportDiagnostics();
      if (!exportDiagnostics) {
        return;
      }

      console.log(
        "[folge-runtime] pdf-export-console",
        JSON.stringify({
          sourcePath: exportDiagnostics.sourcePath,
          windowId: win.id,
          level,
          message,
          line,
          sourceId
        })
      );
    }
  );

  win.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      maybeAttachExportDiagnostics();
      if (!exportDiagnostics) {
        return;
      }

      console.log(
        "[folge-runtime] pdf-export-did-fail-load",
        JSON.stringify({
          sourcePath: exportDiagnostics.sourcePath,
          windowId: win.id,
          errorCode,
          errorDescription,
          validatedURL,
          isMainFrame
        })
      );
    }
  );

  win.webContents.on("render-process-gone", (_event, details) => {
    maybeAttachExportDiagnostics();
    if (!exportDiagnostics) {
      return;
    }

    console.log(
      "[folge-runtime] pdf-export-render-process-gone",
      JSON.stringify({
        sourcePath: exportDiagnostics.sourcePath,
        windowId: win.id,
        details
      })
    );
  });

  win.on("unresponsive", () => {
    maybeAttachExportDiagnostics();
    if (!exportDiagnostics) {
      return;
    }

    console.log(
      "[folge-runtime] pdf-export-window-unresponsive",
      JSON.stringify({
        sourcePath: exportDiagnostics.sourcePath,
        windowId: win.id,
        sinceRequestMs: Date.now() - exportDiagnostics.requestedAt
      })
    );
  });

  win.on("closed", () => {
    if (exportDiagnostics) {
      pendingPdfExports.delete(exportDiagnostics.sourcePath);
      console.log(
        "[folge-runtime] pdf-export-window-closed",
        JSON.stringify({
          sourcePath: exportDiagnostics.sourcePath,
          windowId: win.id,
          totalMs: Date.now() - exportDiagnostics.requestedAt
        })
      );
    }
  });
});

require("./dist/electron/main.js");
