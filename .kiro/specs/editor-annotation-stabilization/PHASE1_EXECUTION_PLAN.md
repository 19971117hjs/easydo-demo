# Phase 1 Execution Plan: Annotation Validation & Stabilization

## Quick Start

### Prerequisites
```bash
cd easydo
pnpm dev
```

Then:
1. Open http://localhost:5173 in browser
2. Create a new guide or open existing project
3. Navigate to Editor view with a screenshot
4. Open DevTools (F12) to monitor console

### Test Data
- Use a standard screenshot (1440x900 recommended)
- Have multiple images ready for testing different sizes

---

## Week 1: Annotation Type Testing (1.1-1.13)

### Day 1: Rectangle, Ellipse, Highlight (1.1-1.3)

**Morning Session (1-2 hours)**:
1. Test Rectangle (1.1)
   - [ ] Draw rectangle
   - [ ] Select and move
   - [ ] Resize all corners
   - [ ] Delete via Delete key
   - [ ] Verify bounds normalized
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

2. Test Ellipse (1.2)
   - [ ] Draw ellipse
   - [ ] Select and move
   - [ ] Resize all corners
   - [ ] Delete via Backspace
   - [ ] Verify circular selection border
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

3. Test Highlight (1.3)
   - [ ] Draw highlight
   - [ ] Verify semi-transparent yellow fill
   - [ ] Select and move
   - [ ] Resize
   - [ ] Delete
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

**Afternoon Session (1-2 hours)**:
- Document any bugs found
- Take screenshots of issues
- Note console errors

---

### Day 2: Text, Tooltip, Blur (1.4-1.6)

**Morning Session**:
1. Test Text (1.4)
   - [ ] Draw large text box
   - [ ] Verify prompt appears
   - [ ] Enter text
   - [ ] Draw compact text (single click)
   - [ ] Double-click to edit
   - [ ] Verify text displays correctly
   - [ ] Test font size control
   - [ ] Test font weight control
   - [ ] Test text color control
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

2. Test Tooltip (1.5)
   - [ ] Draw large tooltip
   - [ ] Verify prompt appears
   - [ ] Draw compact tooltip
   - [ ] Verify arrow pointer displays
   - [ ] Test tooltip placement (top/bottom/left/right)
   - [ ] Verify shadow effect
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

3. Test Blur (1.6)
   - [ ] Draw blur region
   - [ ] Verify blur effect applied
   - [ ] Test blur amount slider (0-20px)
   - [ ] Verify blur updates in real-time
   - [ ] Resize blur region
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

**Afternoon Session**:
- Document bugs
- Take screenshots
- Note any performance issues

---

### Day 3: Magnify, Arrow, Line (1.7-1.9)

**Morning Session**:
1. Test Magnify (1.7)
   - [ ] Draw magnify region
   - [ ] Verify magnified content displays
   - [ ] Verify circular shape with white border
   - [ ] Test magnify zoom slider (1.2-4x)
   - [ ] Verify aspect ratio preserved on resize
   - [ ] Verify shadow effect
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

2. Test Arrow (1.8)
   - [ ] Draw arrow
   - [ ] Verify arrowhead at end
   - [ ] Drag start endpoint
   - [ ] Drag end endpoint
   - [ ] Test line style (solid/dashed)
   - [ ] Test arrow head toggles
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

3. Test Line (1.9)
   - [ ] Draw line
   - [ ] Verify NO arrowhead
   - [ ] Drag endpoints
   - [ ] Test line style
   - [ ] Verify different from arrow
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

**Afternoon Session**:
- Document bugs
- Compare arrow vs line behavior
- Note any endpoint handling issues

---

### Day 4: Brush, Click, Cursor (1.10-1.12)

**Morning Session**:
1. Test Brush (1.10)
   - [ ] Draw freehand path
   - [ ] Verify polyline with round caps
   - [ ] Verify points sampled (not too dense)
   - [ ] Select brush
   - [ ] Verify bounding box calculated
   - [ ] Resize brush
   - [ ] Verify path resizes correctly
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

2. Test Click (1.11)
   - [ ] Single click to create marker
   - [ ] Verify number 1 appears
   - [ ] Create second click
   - [ ] Verify number 2
   - [ ] Create third click
   - [ ] Verify number 3
   - [ ] Move click marker
   - [ ] Delete click marker
   - [ ] Test cursor variant (pointer/text/hand)
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

3. Test Cursor (1.12)
   - [ ] Draw large cursor
   - [ ] Verify cursor glyph displays
   - [ ] Draw compact cursor (single click)
   - [ ] Test cursor variant control
   - [ ] Change to text cursor
   - [ ] Change to hand cursor
   - [ ] Verify glyph changes
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

**Afternoon Session**:
- Document bugs
- Test click numbering edge cases
- Test cursor glyph rendering

---

### Day 5: Asset & Summary (1.13)

**Morning Session**:
1. Test Asset (1.13)
   - [ ] Click asset tool
   - [ ] Select image file
   - [ ] Verify asset displays
   - [ ] Verify border and shadow
   - [ ] Resize asset
   - [ ] Verify aspect ratio preserved
   - [ ] Test border radius control
   - [ ] Test opacity control
   - [ ] Delete asset
   - **Status**: PASS / FAIL
   - **Issues Found**: [list any bugs]

**Afternoon Session**:
- Compile all bugs found in Week 1
- Categorize by severity (Critical/High/Medium/Low)
- Categorize by type (Interaction/Rendering/Performance/Focus)
- Create bug list for Week 2 fixes

**Week 1 Summary**:
- [ ] All 13 types tested
- [ ] Total bugs found: __
- [ ] Critical bugs: __
- [ ] High priority bugs: __
- [ ] Medium priority bugs: __
- [ ] Low priority bugs: __

---

## Week 2: Interaction Stability & Focus Management (1.2-1.4)

### Day 1-2: Interaction Stability (1.2)

**Test Selection & Deselection (2.1)**:
- [ ] Draw annotation
- [ ] Click to select
- [ ] Verify blue dashed border
- [ ] Click empty canvas
- [ ] Verify deselected
- [ ] Draw two annotations
- [ ] Select first
- [ ] Select second
- [ ] Verify only one selected
- **Status**: PASS / FAIL

**Test Move Interaction (2.2)**:
- [ ] For each type: draw, select, move
- [ ] Verify size unchanged
- [ ] Move to edges
- [ ] Verify bounds clamped
- [ ] Move to corners
- [ ] Verify all bounds constraints
- **Status**: PASS / FAIL

**Test Resize Interaction (2.3)**:
- [ ] For each area type: resize all corners
- [ ] Verify minimum size enforced
- [ ] For asset/magnify: verify aspect ratio
- [ ] For line/arrow: drag endpoints
- **Status**: PASS / FAIL

**Test Delete Operation (2.4)**:
- [ ] Delete via Delete key
- [ ] Delete via Backspace key
- [ ] Delete via button
- [ ] Delete multiple annotations
- [ ] Verify selection cleared
- **Status**: PASS / FAIL

**Test Layer Management (2.5)**:
- [ ] Draw overlapping annotations
- [ ] Test Forward button
- [ ] Test Backward button
- [ ] Test Front button
- [ ] Test Back button
- [ ] Verify visual stacking
- [ ] Verify order persisted
- **Status**: PASS / FAIL

**Test Keyboard Shortcuts (2.6)**:
- [ ] Delete shortcut
- [ ] Backspace shortcut
- [ ] Escape shortcut
- [ ] Enter for text edit
- [ ] Verify shortcuts disabled when editor focused
- **Status**: PASS / FAIL

### Day 3-4: Focus Management (1.3)

**Test Canvas Focus (3.1)**:
- [ ] Click canvas
- [ ] Verify focus
- [ ] Draw annotation
- [ ] Verify focus maintained
- [ ] Release mouse
- [ ] Verify focus maintained
- **Status**: PASS / FAIL

**Test Text Editor Focus (3.2)**:
- [ ] Click text editor
- [ ] Verify focus
- [ ] Type text
- [ ] Press Delete
- [ ] Verify text deleted (not annotation)
- [ ] Verify shortcuts disabled
- **Status**: PASS / FAIL

**Test Details Panel Focus (3.3)**:
- [ ] Click color picker
- [ ] Verify focus
- [ ] Press Delete
- [ ] Verify input cleared (not annotation)
- [ ] Test Tab navigation
- **Status**: PASS / FAIL

### Day 5: Bug Fixes & Regression (1.4)

**Fix Critical Bugs**:
- [ ] List all critical bugs
- [ ] Fix each one
- [ ] Test fix
- [ ] Verify no regressions

**Fix High Priority Bugs**:
- [ ] List all high priority bugs
- [ ] Fix each one
- [ ] Test fix
- [ ] Verify no regressions

**Regression Testing**:
- [ ] Re-test all 13 types
- [ ] Re-test all interactions
- [ ] Re-test focus management
- [ ] Verify no new bugs introduced

**Week 2 Summary**:
- [ ] All interaction tests completed
- [ ] All focus management tests completed
- [ ] All critical bugs fixed
- [ ] All high priority bugs fixed
- [ ] Regression testing passed
- [ ] Ready for Phase 2

---

## Bug Tracking

### Critical Bugs (Must Fix Before Phase 2)
```
Bug #1: [Title]
- Severity: Critical
- Type: [Interaction/Rendering/Performance/Focus]
- Steps: ...
- Fix: ...
- Status: [Not Started/In Progress/Fixed/Verified]
```

### High Priority Bugs (Should Fix Before Phase 2)
```
Bug #N: [Title]
- Severity: High
- Type: [Interaction/Rendering/Performance/Focus]
- Steps: ...
- Fix: ...
- Status: [Not Started/In Progress/Fixed/Verified]
```

### Medium Priority Bugs (Can Fix in Phase 2)
```
Bug #N: [Title]
- Severity: Medium
- Type: [Interaction/Rendering/Performance/Focus]
- Steps: ...
- Fix: ...
- Status: [Not Started/In Progress/Fixed/Verified]
```

### Low Priority Bugs (Can Fix Later)
```
Bug #N: [Title]
- Severity: Low
- Type: [Interaction/Rendering/Performance/Focus]
- Steps: ...
- Fix: ...
- Status: [Not Started/In Progress/Fixed/Verified]
```

---

## Testing Checklist

### Phase 1 Complete When:
- [ ] All 13 annotation types tested
- [ ] All interaction patterns tested
- [ ] All focus management scenarios tested
- [ ] All critical bugs fixed
- [ ] All high priority bugs fixed
- [ ] Regression testing passed
- [ ] No console errors
- [ ] No visual glitches
- [ ] Performance acceptable (60 FPS during drag)

### Ready for Phase 2 When:
- [ ] Phase 1 complete
- [ ] All acceptance criteria 1.1-1.13 passing
- [ ] All acceptance criteria 2.1-2.6 passing
- [ ] All acceptance criteria 3.1-3.3 passing
- [ ] Zero critical bugs
- [ ] Zero high priority bugs
- [ ] Documentation updated

---

## Notes & Observations

### Week 1 Notes:
[Add observations during testing]

### Week 2 Notes:
[Add observations during testing]

### Performance Observations:
- Drag FPS: __
- Creation time: __ms
- Selection change time: __ms
- Zoom transition smoothness: __

### Browser Compatibility:
- [ ] Chrome: PASS / FAIL
- [ ] Firefox: PASS / FAIL
- [ ] Safari: PASS / FAIL
- [ ] Edge: PASS / FAIL

### OS Compatibility:
- [ ] macOS: PASS / FAIL
- [ ] Windows: PASS / FAIL
- [ ] Linux: PASS / FAIL

---

## Success Criteria

Phase 1 is successful when:
1. ✓ All 13 annotation types fully functional
2. ✓ All interactions stable and responsive
3. ✓ Focus management working correctly
4. ✓ Zero critical bugs
5. ✓ Zero high priority bugs
6. ✓ 60 FPS during drag operations
7. ✓ <100ms annotation creation
8. ✓ All acceptance criteria passing
9. ✓ Ready to move to Phase 2

---

## Next Steps After Phase 1

1. Review Phase 1 results
2. Document lessons learned
3. Update design doc if needed
4. Begin Phase 2: UI Polish
   - Selection UI refinement
   - Visual feedback enhancement
   - Performance optimization
   - Keyboard shortcuts documentation
