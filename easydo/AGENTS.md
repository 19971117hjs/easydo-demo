# easyDo Agent Guide

## Source-of-Truth Rule

- For every user-facing workflow, behavior, window interaction, and visual state that already exists in Folge, treat the recovered Folge runtime as the primary source of truth.
- Before implementing or changing a feature, inspect the recovered Folge runtime under `/Users/jsh/Desktop/Folge_local_runtime/dist/electron` and map the current easyDo behavior against it.
- Default implementation strategy is parity-first, not reinterpretation-first.
- Do not invent alternate interaction models, window orchestration, or UI flows when Folge already provides a working reference.
- If easyDo intentionally deviates from Folge, document the reason and tradeoff in code comments or the relevant architecture note before shipping the change.
- If the Folge implementation is still unclear after inspection, stop and continue investigation; do not guess and present the guess as if it were verified.
- Never claim a feature is “following Folge” unless the corresponding Folge runtime path, event flow, or UI state has actually been inspected.

### Evidence rule

- Every parity-sensitive change must record which Folge runtime path or event flow was inspected before implementation.
- At minimum, note the inspected file paths in the relevant commit message, architecture note, or task log.
- For capture-related work, do not mark a flow as done unless both the easyDo path and the corresponding Folge path have been compared end-to-end.

### Required workflow

1. Find the relevant Folge runtime entry points, events, and renderer states.
2. Compare them with the current easyDo implementation.
3. Reproduce the same behavior in easyDo first.
4. Only after parity is reached, consider incremental improvements that do not break the verified flow.

### Packaged-app verification rule

Electron features that depend on OS permissions, overlay windows, transparent windows, always-on-top behavior, `setIgnoreMouseEvents`, native hooks, screen capture, focus, or workspace visibility must be verified in the packaged app, not only in `electron-vite dev`.

- Dev-mode success is necessary but not sufficient.
- For these features, “done” means:
  1. dev mode works
  2. packaged app works
  3. no known parity gap remains against Folge for the exercised path
- If packaged and dev behavior diverge, treat the feature as unresolved and document the divergence immediately.

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
