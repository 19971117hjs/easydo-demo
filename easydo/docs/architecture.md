# easyDo Architecture

## Product Goal

`easyDo` is a clean-room Electron + Vue 3 rebuild of the workflow capture and documentation app currently preserved through a recovered runtime bundle. The rebuild should keep the business value of the original product while removing the long-term maintenance risk of decompiled application code.

## Architectural Principles

1. Native boundaries stay in the main process.
2. Authoring and workflow UX stay in the renderer.
3. Contracts between layers are typed and explicit.
4. Capture, export, and persistence are replaceable adapters.
5. Migration happens feature-by-feature, not by copying the old bundle wholesale.
6. Existing Folge behavior is the implementation baseline for rebuilt features until an explicit deviation is reviewed and documented.

## Parity-First Rebuild Rule

The recovered Folge runtime in `/Users/jsh/Desktop/Folge_local_runtime/dist/electron` is the reference implementation for all already-existing product behavior.

- Rebuild work must begin by inspecting the relevant Folge runtime paths, not by freehand reimagining the feature.
- “Equivalent behavior” includes event timing, window orchestration, capture lifecycle, interaction lock/unlock rules, and visible UI states, not just rough feature presence.
- When easyDo behavior differs from Folge, that difference must be treated as a bug or an intentional divergence; it must never remain an undocumented guess.
- If the team chooses to improve on Folge, that decision comes after parity and must record why the original behavior was changed.

### Verification requirements

- Any parity-sensitive feature must carry two kinds of evidence:
  - source evidence: which Folge runtime files, routes, windows, IPC events, or state transitions were inspected
  - runtime evidence: whether the rebuilt flow was verified in dev mode and in the packaged app
- For capture and editor interactions, packaged verification is mandatory because transparent windows, native hooks, permissions, and focus behavior can diverge from dev mode.
- A feature is not “complete” when only renderer visuals appear correct; completion requires the verified event and window lifecycle to match the inspected Folge flow closely enough for the same task path to succeed.

## Proposed Bounded Contexts

### 1. Shell / Native Runtime

- Electron app lifecycle
- Window orchestration
- Accessibility and screen-recording permissions
- Native input hooks
- Screen capture overlay windows
- OS dialogs and file system access

### 2. Workflow Authoring

- Guide metadata
- Step list authoring
- Rich text instructions
- Reordering and grouping
- Validation and autosave policies

### 3. Capture Orchestration

- Capture state machine
- Screenshot and annotation pipeline
- Mouse and keyboard event normalization
- Mapping raw events into human-readable step suggestions

### 4. Export Pipeline

- PDF export
- DOCX / PowerPoint export
- Asset collection
- Template rendering

### 5. Persistence

- Local workspace drafts
- Imported and exported project bundles
- Future sync or cloud adapters

## Migration Roadmap

### Phase 1

- Establish Electron + Vue 3 foundation
- Create typed IPC contracts
- Implement local project drafts
- Stand up capture state machine placeholder

### Phase 2

- Replace placeholder capture service with native screen + input adapters
- Build overlay window manager
- Introduce screenshot asset storage and indexing

#### Current MVP status

- Primary display screenshot capture is wired through Electron native APIs.
- Screen capture permission probing is available in the main process.
- Captured screenshots are stored under the local project asset directory.
- Each capture appends a new workflow step with an image attachment.
- Global mouse and keyboard hooks are intentionally deferred to the next iteration.

### Phase 3

- Rebuild editor around rich text and step composition
- Add autosave and project library
- Recreate export flows

### Phase 4

- Packaging, updater strategy, and production hardening
- Structured logging and diagnostics
- Regression checklist against the recovered runtime

## Implementation Guardrails

- Do not describe a feature as “done” unless its core flow has been checked against the Folge runtime.
- Do not describe a parity-sensitive Electron workflow as “done” unless it has also been exercised in the packaged app.
- Do not replace unclear Folge behavior with guessed UX just to keep progress moving.
- Prefer extracting architecture and event flow from the recovered runtime over adding speculative abstractions in easyDo.
