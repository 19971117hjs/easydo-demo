# easyDo Architecture

## Product Goal

`easyDo` is a clean-room Electron + Vue 3 rebuild of the workflow capture and documentation app currently preserved through a recovered runtime bundle. The rebuild should keep the business value of the original product while removing the long-term maintenance risk of decompiled application code.

## Architectural Principles

1. Native boundaries stay in the main process.
2. Authoring and workflow UX stay in the renderer.
3. Contracts between layers are typed and explicit.
4. Capture, export, and persistence are replaceable adapters.
5. Migration happens feature-by-feature, not by copying the old bundle wholesale.

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
