# Keyboard Shortcuts Reference

## Annotation Editing

### Selection & Deletion
| Shortcut | Action | Context |
|----------|--------|---------|
| `Delete` | Delete selected annotation | Canvas focused, annotation selected |
| `Backspace` | Delete selected annotation | Canvas focused, annotation selected |
| `Escape` | Cancel current interaction | Canvas focused, during draw/move/resize |

### Text Editing
| Shortcut | Action | Context |
|----------|--------|---------|
| `Enter` | Edit text/tooltip content | Canvas focused, text/tooltip selected |
| `Double-click` | Edit text/tooltip content | Canvas focused, text/tooltip selected |

### Layer Management
| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl+Z` / `Cmd+Z` | Undo last action | Canvas focused |
| `Ctrl+Y` / `Cmd+Y` | Redo last action | Canvas focused |
| `Ctrl+A` / `Cmd+A` | Select all annotations | Canvas focused |

### Navigation
| Shortcut | Action | Context |
|----------|--------|---------|
| `Tab` | Cycle through annotations | Canvas focused |
| `Shift+Tab` | Cycle through annotations (reverse) | Canvas focused |

## Tool Selection

### Drawing Tools
| Shortcut | Action | Context |
|----------|--------|---------|
| `R` | Rectangle tool | Canvas focused |
| `E` | Ellipse tool | Canvas focused |
| `T` | Text tool | Canvas focused |
| `L` | Line tool | Canvas focused |
| `A` | Arrow tool | Canvas focused |
| `B` | Brush tool | Canvas focused |
| `H` | Highlight tool | Canvas focused |
| `U` | Blur tool | Canvas focused |
| `M` | Magnify tool | Canvas focused |
| `C` | Click marker tool | Canvas focused |
| `S` | Cursor tool | Canvas focused |
| `I` | Asset/Image tool | Canvas focused |
| `O` | Tooltip tool | Canvas focused |

### Special Tools
| Shortcut | Action | Context |
|----------|--------|---------|
| `V` | Select tool | Canvas focused |
| `X` | Crop tool | Canvas focused |

## Zoom Controls

### Zoom Navigation
| Shortcut | Action | Context |
|----------|--------|---------|
| `+` / `=` | Zoom in | Canvas focused |
| `-` | Zoom out | Canvas focused |
| `0` | Fit to window | Canvas focused |
| `1` | 100% zoom | Canvas focused |
| `2` | 50% zoom | Canvas focused |
| `3` | 25% zoom | Canvas focused |

## Focus Management

### Focus Navigation
| Shortcut | Action | Context |
|----------|--------|---------|
| `Tab` | Move focus to next element | Any |
| `Shift+Tab` | Move focus to previous element | Any |
| `Ctrl+Tab` | Focus canvas | Any |
| `Ctrl+Shift+Tab` | Focus text editor | Any |

## Interaction Feedback

### Visual Feedback During Interactions

#### Hover States
- **Annotations**: Subtle glow effect appears on hover
- **Handles**: Handles enlarge and brighten on hover
- **Cursor**: Changes to indicate action (move, resize, etc.)

#### Drag Feedback
- **Cursor**: Changes to "grabbing" hand during drag
- **Visual**: Semi-transparent copy shows during drag
- **Position**: Coordinates displayed during drag

#### Resize Feedback
- **Cursor**: Changes based on resize direction (↔, ↕, ↖, ↗, etc.)
- **Dimensions**: Size indicator shown during resize
- **Aspect Ratio**: Lock indicator for asset/magnify types

#### Selection Feedback
- **Border**: 2px dashed blue border appears on selection
- **Handles**: Resize handles appear at corners
- **Animation**: Smooth fade-in animation (200ms)

## Accessibility

### Screen Reader Support
- Annotation count announced on selection
- Selected annotation type announced
- Property changes announced
- Buttons have descriptive labels

### Keyboard Navigation
- All tools accessible via keyboard
- Tab navigation works in details panel
- Focus indicators clearly visible
- Color contrast meets WCAG AA

## Tips & Tricks

### Efficient Workflow
1. Use keyboard shortcuts to switch tools quickly
2. Use `Escape` to cancel drawing without creating annotation
3. Use `Delete` to quickly remove mistakes
4. Use `Ctrl+Z` to undo multiple actions
5. Use `Tab` to cycle through annotations for editing

### Performance Tips
1. Use `Escape` to cancel long brush strokes
2. Zoom out before drawing large annotations
3. Use `Ctrl+A` to select all for batch operations
4. Delete unused annotations to improve performance

### Accessibility Tips
1. Use keyboard shortcuts instead of mouse when possible
2. Use `Tab` to navigate between annotations
3. Use `Enter` to edit text content
4. Use `Delete` to remove annotations
5. Use `Escape` to cancel operations

## Customization

### Remapping Shortcuts
Shortcuts can be customized in the settings panel:
1. Open Settings (Ctrl+,)
2. Navigate to Keyboard Shortcuts
3. Click on shortcut to edit
4. Enter new key combination
5. Click Save

### Default Shortcuts
All shortcuts can be reset to defaults:
1. Open Settings (Ctrl+,)
2. Navigate to Keyboard Shortcuts
3. Click "Reset to Defaults"
4. Confirm action

## Troubleshooting

### Shortcuts Not Working
- Ensure canvas is focused (click on canvas)
- Check if shortcut is remapped in settings
- Verify keyboard layout matches expected keys
- Try using alternative shortcuts

### Cursor Not Changing
- Ensure interaction is active (drawing/moving/resizing)
- Check if cursor is over interactive element
- Verify browser supports CSS cursor property
- Try refreshing page

### Focus Issues
- Click on canvas to ensure focus
- Use `Ctrl+Tab` to focus canvas
- Use `Tab` to navigate between elements
- Check if text editor has focus

## Related Documentation

- [Annotation Types Guide](./ANNOTATION_TYPES.md)
- [Interaction Patterns](./INTERACTION_PATTERNS.md)
- [Performance Guide](./PERFORMANCE_GUIDE.md)
- [Accessibility Guide](./ACCESSIBILITY_GUIDE.md)

