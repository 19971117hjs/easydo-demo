# Recorder Parity Workflow

This folder is the single source of truth for Recorder rebuild decisions. Do not adjust the Recorder UI from memory alone.

## How to use it

1. Run the original Folge build.
2. Capture the Recorder states listed in `state-checklist.md`.
3. For each state, create one spec file from `state-spec-template.md`.
4. Save the matching screenshot or short clip beside the spec so implementation and review stay paired.
5. Only after the spec exists should the Recorder UI change in `src/renderer/src/features/recorder`.

## Expected artifact set

- `state-checklist.md`: progress tracker for the 8-12 core states.
- `state-spec-template.md`: repeatable capture sheet for a single state.
- `captures/`: screenshots or clips from Folge.
- `reviews/`: side-by-side easyDo comparison notes after each pass.

## First-pass states

- default-ready
- permission-blocked
- recording-live
- recording-paused
- click-stream-armed
- click-stream-draining
- area-selection-entry
- latest-capture-success
- recorder-error
