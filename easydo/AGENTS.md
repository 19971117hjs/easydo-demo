# easyDo Agent Guide

## Architecture Boundaries

- Keep native OS integration in `src/main`.
- Keep the Electron bridge thin in `src/preload`.
- Keep UI state and interaction logic in `src/renderer`.
- Put every cross-process payload contract in `src/shared/contracts.ts`.

## IPC Payload Hygiene

This project uses Electron IPC together with Vue 3 and Pinia. A recurring failure mode is:

- `An object could not be cloned.`

To avoid this, follow these rules every time data crosses the process boundary.

### Never send these objects over IPC

- Vue reactive proxies
- Pinia store state objects directly
- `ref`, `computed`, or objects derived from them without normalization
- Electron native objects such as `NativeImage`, `BrowserWindow`, `WebContents`, `Error`
- Functions, class instances, Maps, Sets, Symbols, and non-serializable prototypes

### Required rule

- Only send plain JSON-serializable objects through `ipcRenderer.invoke`, `ipcMain.handle`, and event payloads.

### Required practice

- Before renderer -> main IPC calls, convert payloads to plain objects.
- Before main -> renderer resolve values, convert payloads to plain objects.
- If a payload is defined in `contracts.ts`, keep runtime values shaped exactly like that contract.

### Preferred normalization patterns

```ts
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
```

Use this for:

- project drafts before save/capture IPC calls
- capture selection rectangles before confirm IPC calls
- capture results before resolving pending cross-window promises

### Review checklist for IPC-related changes

- Does this payload contain any Vue/Pinia reactive object?
- Does this payload contain any Electron native object?
- Does the return value exactly match `src/shared/contracts.ts`?
- Should normalization happen on both request and response paths?

If any answer is "maybe", normalize before crossing IPC.

## Asset Loading

- Do not render `file://` paths directly in the dev renderer.
- Use the app protocol (`easydo-asset://`) for local asset display.

## Capture Workflow Notes

- Whole-screen capture and area capture should both end in saved project assets plus step creation.
- Overlay windows must not reuse the main application shell layout.
- Selection UI should remain adjustable after mouse release until the user confirms or cancels.
