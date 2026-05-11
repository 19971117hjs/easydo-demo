# Requirements: Editor Annotation Stabilization (P1)

## Acceptance Criteria

### 1. Annotation Type Validation

#### 1.1 Rectangle Annotation
- [ ] Can draw rectangle by click-drag
- [ ] Rectangle displays with correct stroke color and width
- [ ] Can select, move, and resize rectangle
- [ ] Minimum size (0.012) enforced
- [ ] Bounds normalized to [0, 1] range
- [ ] Delete removes rectangle from list

#### 1.2 Ellipse Annotation
- [ ] Can draw ellipse by click-drag
- [ ] Ellipse displays with correct stroke and fill
- [ ] Can select, move, and resize ellipse
- [ ] Aspect ratio preserved during resize (if configured)
- [ ] Bounds normalized correctly

#### 1.3 Highlight Annotation
- [ ] Can draw highlight with semi-transparent fill
- [ ] Highlight color and opacity configurable
- [ ] Can select, move, and resize
- [ ] Minimum size enforced

#### 1.4 Text Annotation
- [ ] Can draw text box by click-drag or single click (compact)
- [ ] Prompt appears for text input on creation
- [ ] Text displays with correct font size and color
- [ ] Can double-click or press Enter to edit text
- [ ] Can select, move, and resize text box
- [ ] Text wraps or truncates appropriately

#### 1.5 Tooltip Annotation
- [ ] Can draw tooltip by click-drag or single click (compact)
- [ ] Prompt appears for tooltip text on creation
- [ ] Tooltip displays with arrow pointer
- [ ] Arrow placement (top/bottom/left/right) configurable
- [ ] Can select, move, and resize
- [ ] Shadow effect displays correctly

#### 1.6 Blur Annotation
- [ ] Can draw blur region by click-drag
- [ ] Blur effect applies to underlying image
- [ ] Blur amount configurable (0-20px)
- [ ] Can select, move, and resize
- [ ] Bounds enforced

#### 1.7 Magnify Annotation
- [ ] Can draw magnify region by click-drag
- [ ] Magnified content displays correctly
- [ ] Zoom level configurable (1.2-4x)
- [ ] Circular shape with border
- [ ] Aspect ratio preserved during resize
- [ ] Shadow effect displays

#### 1.8 Arrow Annotation
- [ ] Can draw arrow by click-drag
- [ ] Arrow displays with arrowhead on end
- [ ] Can select, move, and resize (endpoints)
- [ ] Arrowhead size scales with stroke width
- [ ] Line style (solid/dashed) configurable

#### 1.9 Line Annotation
- [ ] Can draw line by click-drag
- [ ] Line displays with correct stroke
- [ ] Can select, move, and resize (endpoints)
- [ ] Line style (solid/dashed) configurable
- [ ] No arrowhead by default

#### 1.10 Brush Annotation
- [ ] Can draw freehand path by click-drag
- [ ] Points sampled at minimum delta (0.0025)
- [ ] Polyline displays with round caps and joins
- [ ] Can select, move, and resize (bounding box)
- [ ] Stroke width configurable

#### 1.11 Click Annotation
- [ ] Single click creates numbered marker
- [ ] Number auto-increments based on existing clicks
- [ ] Click marker displays with circle, ring, and badge
- [ ] Cursor glyph renders at click location
- [ ] Can select and move click marker
- [ ] Cannot resize (fixed size)

#### 1.12 Cursor Annotation
- [ ] Can draw cursor by click-drag or single click (compact)
- [ ] Cursor variant configurable (pointer/text/hand)
- [ ] Cursor glyph renders correctly
- [ ] Can select, move, and resize
- [ ] Shadow effect displays

#### 1.13 Asset Annotation
- [ ] Can import external image as asset
- [ ] Asset displays with correct dimensions
- [ ] Aspect ratio preserved during resize
- [ ] Can select, move, and resize
- [ ] Shadow effect displays
- [ ] Border radius configurable

### 2. Interaction Stability

#### 2.1 Selection & Deselection
- [ ] Click on annotation selects it (when tool is "select")
- [ ] Selected annotation shows blue dashed border
- [ ] Click on empty canvas deselects
- [ ] Only one annotation selected at a time
- [ ] Selection state emitted correctly

#### 2.2 Move Interaction
- [ ] Click-drag selected annotation moves it
- [ ] Bounds clamped to canvas (0-1 range)
- [ ] Size preserved during move
- [ ] Move works for all annotation types
- [ ] Move completes on mouse up

#### 2.3 Resize Interaction
- [ ] Drag corner handles resizes annotation
- [ ] Minimum size (0.012) enforced
- [ ] Aspect ratio preserved for asset/magnify
- [ ] Resize works for all area types
- [ ] Endpoints draggable for line/arrow types
- [ ] Resize completes on mouse up

#### 2.4 Delete Operation
- [ ] Press Delete key removes selected annotation
- [ ] Press Backspace key removes selected annotation
- [ ] Delete button in details panel removes annotation
- [ ] Selection cleared after delete
- [ ] Annotation removed from list

#### 2.5 Layer Management
- [ ] Forward button moves annotation up in z-order
- [ ] Backward button moves annotation down in z-order
- [ ] Front button moves annotation to top
- [ ] Back button moves annotation to bottom
- [ ] Z-order persisted in annotation.order field
- [ ] Visual stacking reflects z-order

#### 2.6 Keyboard Shortcuts
- [ ] Delete/Backspace deletes selected annotation
- [ ] Escape cancels current interaction
- [ ] Enter edits text/tooltip content
- [ ] Shortcuts work only when canvas focused

### 3. Focus Management

#### 3.1 Canvas Focus
- [ ] Canvas receives focus on mousedown
- [ ] Canvas maintains focus during drag
- [ ] Canvas releases focus on mouseup
- [ ] Keyboard shortcuts work when canvas focused

#### 3.2 Text Editor Focus
- [ ] Text editor receives focus when clicked
- [ ] Text editor maintains focus during typing
- [ ] Annotation shortcuts disabled when editor focused
- [ ] No event conflicts between canvas and editor

#### 3.3 Details Panel Focus
- [ ] Property inputs receive focus when clicked
- [ ] Annotation shortcuts disabled when input focused
- [ ] Tab navigation works within panel
- [ ] No event conflicts with canvas

### 4. Property Editing

#### 4.1 Color Controls
- [ ] Color picker displays for stroke color
- [ ] Color presets available (#f2b91f, #356dff, etc.)
- [ ] Color applied immediately to annotation
- [ ] Color persisted in annotation.color

#### 4.2 Stroke Width
- [ ] Stroke width input accepts numeric values
- [ ] Stroke width applied immediately
- [ ] Minimum stroke width enforced (1px)
- [ ] Maximum stroke width enforced (20px)

#### 4.3 Fill Color
- [ ] Fill color picker for applicable types
- [ ] Fill presets available
- [ ] Fill applied immediately
- [ ] Opacity slider controls transparency

#### 4.4 Text Properties
- [ ] Text content editable via prompt or input
- [ ] Font size adjustable (8-48px)
- [ ] Font weight adjustable (400/700)
- [ ] Text color configurable
- [ ] Text alignment (left/center/right) configurable

#### 4.5 Type-Specific Properties
- [ ] Tooltip placement (top/bottom/left/right) configurable
- [ ] Magnify zoom (1.2-4x) adjustable
- [ ] Blur amount (0-20px) adjustable
- [ ] Cursor variant (pointer/text/hand) selectable
- [ ] Line style (solid/dashed) toggleable
- [ ] Arrow heads (start/end) toggleable

### 5. Rendering & Performance

#### 5.1 SVG Rendering
- [ ] Shapes render correctly in SVG
- [ ] Stroke colors and widths applied
- [ ] Fill colors and opacity applied
- [ ] Rounded corners render correctly
- [ ] Arrowheads render correctly

#### 5.2 HTML Rendering
- [ ] Blur effect renders correctly
- [ ] Magnify effect renders correctly
- [ ] Tooltip displays with pointer
- [ ] Asset images display correctly
- [ ] Shadow effects render

#### 5.3 Selection UI
- [ ] Selection border displays correctly
- [ ] Resize handles display at corners
- [ ] Endpoint handles display for lines
- [ ] Handles are clickable and draggable
- [ ] Selection UI updates on zoom change

#### 5.4 Performance
- [ ] 60 FPS during drag operations
- [ ] <100ms for annotation creation
- [ ] <50ms for selection change
- [ ] Smooth zoom transitions
- [ ] No lag with 50+ annotations

### 6. Zoom & Viewport

#### 6.1 Zoom Scaling
- [ ] Zoom 10-100% supported
- [ ] Stage dimensions scale with zoom
- [ ] Annotations scale with zoom
- [ ] Selection handles scale with zoom
- [ ] Interaction coordinates adjusted for zoom

#### 6.2 Fit Zoom
- [ ] Auto-fit calculates correct zoom
- [ ] Fit zoom recalculates on viewport resize
- [ ] Fit zoom respects left/right panel collapse
- [ ] Fit zoom respects focused view mode

#### 6.3 Manual Zoom
- [ ] Manual zoom presets available (10%, 25%, 50%, 75%, 100%)
- [ ] Zoom in/out buttons work
- [ ] Keyboard shortcuts (=/- keys) work
- [ ] Zoom persists during session

### 7. Undo/Redo Integration

#### 7.1 Annotation Creation
- [ ] Undo reverts annotation creation
- [ ] Redo restores annotation
- [ ] Undo/redo works for all types

#### 7.2 Annotation Modification
- [ ] Undo reverts property changes
- [ ] Undo reverts move operations
- [ ] Undo reverts resize operations
- [ ] Redo restores changes

#### 7.3 Annotation Deletion
- [ ] Undo restores deleted annotation
- [ ] Redo removes annotation again
- [ ] Z-order restored correctly

### 8. Data Persistence

#### 8.1 Annotation Storage
- [ ] Annotations saved to step.annotations
- [ ] All properties persisted correctly
- [ ] Bounds normalized on save
- [ ] Z-order persisted

#### 8.2 State Sync
- [ ] Parent component receives update:annotations event
- [ ] Parent component receives update:selectedId event
- [ ] State syncs between component and store
- [ ] No data loss on navigation

### 9. Error Handling

#### 9.1 Invalid Bounds
- [ ] Out-of-range bounds clamped automatically
- [ ] Negative dimensions handled
- [ ] Zero dimensions prevented

#### 9.2 Missing References
- [ ] Missing annotation ID handled gracefully
- [ ] Selection cleared if annotation deleted
- [ ] No console errors

#### 9.3 Concurrent Modifications
- [ ] Interaction uses snapshot of original annotation
- [ ] Changes committed to latest state
- [ ] No data corruption

### 10. Accessibility

#### 10.1 Keyboard Navigation
- [ ] All tools accessible via keyboard
- [ ] Shortcuts documented
- [ ] Tab navigation works in details panel

#### 10.2 Visual Feedback
- [ ] Selected annotation clearly visible
- [ ] Hover states visible
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA

#### 10.3 Screen Reader Support
- [ ] Annotation count announced
- [ ] Selected annotation type announced
- [ ] Property changes announced
- [ ] Buttons have descriptive labels

## Acceptance Criteria Mapping

| Criterion | Type | Test Method |
|-----------|------|-------------|
| 1.1-1.13 | Functional | Manual testing + unit tests |
| 2.1-2.6 | Functional | Integration tests + manual |
| 3.1-3.3 | Functional | Integration tests |
| 4.1-4.5 | Functional | Unit tests + manual |
| 5.1-5.4 | Performance | Performance tests + manual |
| 6.1-6.3 | Functional | Integration tests |
| 7.1-7.3 | Functional | Integration tests |
| 8.1-8.2 | Functional | Integration tests |
| 9.1-9.3 | Robustness | Error scenario tests |
| 10.1-10.3 | Accessibility | Manual + a11y tools |

## Success Metrics

- All 13 annotation types fully functional and tested
- Zero critical bugs in annotation interaction
- 60 FPS performance during drag operations
- <100ms annotation creation time
- 100% keyboard shortcut coverage
- Zero focus conflicts between canvas and editor
- All acceptance criteria passing
