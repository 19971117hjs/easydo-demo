try {
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    writable: true,
    value: undefined
  });
} catch {
  try {
    globalThis.fetch = undefined;
  } catch {
    // Ignore environments where the global cannot be reassigned.
  }
}

require("tesseract.js/src/worker-script/node/index.js");
