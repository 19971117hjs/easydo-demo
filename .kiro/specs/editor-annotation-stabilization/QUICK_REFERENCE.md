# Quick Reference: Annotation Testing

## 13 Annotation Types at a Glance

| # | Type | Draw | Edit | Render | Min Size | Aspect Ratio |
|---|------|------|------|--------|----------|--------------|
| 1 | Rectangle | Drag | Move/Resize | SVG | 0.012 | No |
| 2 | Ellipse | Drag | Move/Resize | SVG | 0.012 | No |
| 3 | Highlight | Drag | Move/Resize | SVG | 0.012 | No |
| 4 | Text | Drag/Click | Move/Resize/Edit | SVG | 0.012 | No |
| 5 | Tooltip | Drag/Click | Move/Resize/Edit | HTML | 0.012 | No |
| 6 | Blur | Drag | Move/Resize | HTML | 0.012 | No |
| 7 | Magnify | Drag | Move/Resize | HTML | 0.012 | **Yes** |
| 8 | Arrow | Drag | Move/Resize Endpoints | SVG | N/A | No |
| 9 | Line | Drag | Move/Resize Endpoints | SVG | N/A | No |
| 10 | Brush | Drag | Move/Resize | SVG | 0.012 | No |
| 11 | Click | Click | Move | SVG | Fixed | No |
| 12 | Cursor | Drag/Click | Move/Resize | SVG | 0.012 | No |
| 13 | Asset | Click | Move/Resize | HTML | 0.012 | **Yes** |

## Keyboard Shortcuts

| Key | Action | When |
|-----|--------|------|
| Delete | Delete selected annotation | Canvas focused |
| Backspace | Delete selected annotation | Canvas focused |
| Escape | Cancel current interaction | Canvas focused |
| Enter | Edit text/tooltip content | Canvas focused + text/tooltip selected |
| Tab | Navigate details panel | Details panel focused |

## Tool Selection

```
Canvas Tools (in toolbar):
- Select (pointer icon)
- Rectangle
- Ellipse
- Highlight
- Text
- Tooltip
- Blur
- Magnify
- Arrow
- Line
- Brush
- Click
- Cursor
- Asset
- Crop
```

## Common Test Patterns

### Draw & Delete
1. Click tool
2. Draw annotation (drag or click)
3. Select annotation
4. Press Delete
5. Verify removed

### Move & Resize
1. Draw annotation
2. Select annotation
3. Click-drag to move
4. Drag corner handle to resize
5. Verify bounds clamped to [0, 1]

### Edit Properties
1. Draw annotation
2. Select annotation
3. Open Step Details panel
4. Adjust properties (color, size, etc.)
5. Verify changes applied immediately

### Focus Management
1. Click canvas
2. Verify keyboard shortcuts work
3. Click text editor
4. Verify annotation shortcuts disabled
5. Click canvas again
6. Verify shortcuts work again

## Expected Behaviors

### All Annotations
- ✓ Minimum size: 0.012 (1.2% of canvas)
- ✓ Bounds normalized to [0, 1]
- ✓ Selection: blue dashed border
- ✓ Delete: removes from list
- ✓ Move: preserves size
- ✓ Resize: enforces minimum size

### Area Types (rect, ellipse, highlight, text, tooltip, blur, magnify, cursor, asset)
- ✓ Draw: click-drag from start to end
- ✓ Resize: drag corner handles (nw, ne, se, sw)
- ✓ Compact creation: single click for text/tooltip/cursor

### Linear Types (line, arrow, brush)
- ✓ Draw: click-drag from start to end
- ✓ Resize: drag endpoint handles (start, end)
- ✓ Arrow: arrowhead at end point

### Point Types (click)
- ✓ Create: single click
- ✓ Number: auto-increment
- ✓ Move: click-drag
- ✓ Cannot resize

## Performance Targets

- [ ] 60 FPS during drag operations
- [ ] <100ms annotation creation
- [ ] <50ms selection change
- [ ] Smooth zoom transitions
- [ ] No lag with 50+ annotations

## Common Issues to Watch For

### Rendering Issues
- [ ] Annotation not visible
- [ ] Selection border not showing
- [ ] Handles not clickable
- [ ] Text not displaying
- [ ] Blur/magnify effect not working

### Interaction Issues
- [ ] Can't select annotation
- [ ] Move doesn't work
- [ ] Resize doesn't work
- [ ] Delete doesn't work
- [ ] Keyboard shortcuts not working

### Focus Issues
- [ ] Shortcuts work when editor focused
- [ ] Canvas shortcuts don't work
- [ ] Event conflicts between canvas and editor
- [ ] Tab navigation broken

### Bounds Issues
- [ ] Annotation goes outside canvas
- [ ] Minimum size not enforced
- [ ] Bounds not normalized
- [ ] Aspect ratio not preserved

## Debug Tips

### Check Console
```javascript
// Open DevTools (F12)
// Look for errors/warnings
// Check network tab for image loading
```

### Inspect Element
```javascript
// Right-click annotation
// Select "Inspect"
// Check SVG/HTML structure
// Verify CSS classes applied
```

### Test Bounds
```javascript
// Select annotation
// Open DevTools Console
// Check annotation.x, annotation.y, annotation.width, annotation.height
// Verify all in [0, 1] range
```

### Test Performance
```javascript
// Open DevTools Performance tab
// Record while dragging annotation
// Check FPS (should be 60)
// Look for long tasks
```

## Test Data

### Standard Screenshot
- Size: 1440x900
- Format: PNG or JPG
- Content: Desktop with multiple windows

### Large Screenshot
- Size: 3840x2160 (4K)
- Format: PNG
- Content: Complex desktop

### Small Screenshot
- Size: 640x480
- Format: PNG
- Content: Simple desktop

### Wide Screenshot
- Size: 2560x720
- Format: PNG
- Content: Ultrawide desktop

### Tall Screenshot
- Size: 720x2560
- Format: PNG
- Content: Vertical desktop

## Test Checklist Template

```markdown
### Test: [Annotation Type]
- [ ] Draw annotation
- [ ] Select annotation
- [ ] Move annotation
- [ ] Resize annotation
- [ ] Delete annotation
- [ ] Verify bounds normalized
- [ ] Verify no console errors
- [ ] Verify visual appearance correct

**Status**: PASS / FAIL
**Issues**: [list any bugs]
**Notes**: [any observations]
```

## Bug Report Template

```markdown
### Bug: [Title]
**Severity**: Critical / High / Medium / Low
**Type**: Interaction / Rendering / Performance / Focus / Other

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Result**:
...

**Actual Result**:
...

**Console Errors**:
...

**Screenshot**: [attach if possible]

**Affected Types**:
- [ ] rect
- [ ] ellipse
- [ ] highlight
- [ ] text
- [ ] tooltip
- [ ] blur
- [ ] magnify
- [ ] arrow
- [ ] line
- [ ] brush
- [ ] click
- [ ] cursor
- [ ] asset

**Fix Status**: Not Started / In Progress / Fixed / Verified
```

## Resources

- **Design Doc**: `.kiro/specs/editor-annotation-stabilization/design.md`
- **Requirements**: `.kiro/specs/editor-annotation-stabilization/requirements.md`
- **Testing Guide**: `.kiro/specs/editor-annotation-stabilization/TESTING_GUIDE.md`
- **Execution Plan**: `.kiro/specs/editor-annotation-stabilization/PHASE1_EXECUTION_PLAN.md`
- **Component**: `easydo/src/renderer/src/components/ScreenshotAnnotator.vue`
- **Shared Utils**: `easydo/src/shared/step-annotations.ts`

## Quick Links

- Start dev server: `cd easydo && pnpm dev`
- Type check: `cd easydo && pnpm typecheck`
- Build: `cd easydo && pnpm build`
- Package: `cd easydo && pnpm dist:mac`

## Success Criteria

Phase 1 is complete when:
- ✓ All 13 types tested and working
- ✓ All interactions stable
- ✓ Focus management correct
- ✓ Zero critical bugs
- ✓ Zero high priority bugs
- ✓ Performance targets met
- ✓ Ready for Phase 2
