# Visual Feedback Guide

## Overview

This guide documents all visual feedback mechanisms in the annotation system, including hover states, animations, cursor changes, and interaction feedback.

## Hover States

### Annotation Hover

#### SVG Annotations (rect, ellipse, line, arrow, brush, text, highlight)
- **Effect**: Subtle glow effect
- **Color**: `rgba(53, 109, 255, 0.15)`
- **Duration**: 150ms ease-out transition
- **Trigger**: Mouse hover over annotation

```css
.annotator__shape:hover {
  filter: drop-shadow(0 0 0.3rem rgba(53, 109, 255, 0.15));
}
```

#### HTML Annotations (blur, magnify, tooltip, asset)
- **Effect**: Subtle glow effect
- **Color**: `rgba(53, 109, 255, 0.15)`
- **Duration**: 150ms ease-out transition
- **Trigger**: Mouse hover over annotation

```css
.annotator__blur:hover,
.annotator__magnify:hover,
.annotator__tooltip-html:hover,
.annotator__asset:hover {
  filter: drop-shadow(0 0 0.3rem rgba(53, 109, 255, 0.15));
}
```

### Handle Hover

#### Resize Handles
- **Effect**: Enlarge and brighten
- **Size Change**: 12px → 16px
- **Color Change**: `#356dff` → `#4a7dff`
- **Shadow**: Enhanced shadow on hover
- **Duration**: 150ms ease-out transition
- **Trigger**: Mouse hover over handle

```css
.annotator__handle:hover {
  width: 16px;
  height: 16px;
  background: #4a7dff;
  box-shadow: 0 2px 12px rgba(53, 109, 255, 0.4);
}
```

#### Endpoint Handles
- **Effect**: Same as resize handles
- **Size**: 14px → 18px
- **Trigger**: Mouse hover over endpoint

## Cursor Changes

### Cursor States

| State | Cursor | Trigger |
|-------|--------|---------|
| Default | `default` | No interaction |
| Hovering annotation | `move` | Mouse over annotation |
| Dragging annotation | `grabbing` | During move interaction |
| Hovering handle | `resize` | Mouse over resize handle |
| Resizing | `resize` | During resize interaction |
| Hovering endpoint | `grab` | Mouse over endpoint |
| Resizing endpoint | `grab` | During endpoint resize |

### Cursor Implementation

```typescript
const currentCursor = computed(() => {
  if (interaction.value?.mode === "move") {
    return "grabbing";
  }
  if (interaction.value?.mode === "resize") {
    const handle = interaction.value.handle;
    const cursorMap: Record<ResizeHandle, string> = {
      nw: "nwse-resize",
      ne: "nesw-resize",
      se: "nwse-resize",
      sw: "nesw-resize",
      start: "grab",
      end: "grab"
    };
    return cursorMap[handle] || "grab";
  }
  if (props.activeTool === "select" && selectedDisplayAnnotation.value) {
    return "move";
  }
  return "default";
});
```

## Selection Feedback

### Selection Border

#### Visual Properties
- **Style**: 2px dashed
- **Color**: `rgba(56, 105, 255, 0.95)`
- **Border Radius**: 12px (or 999px for click markers)
- **Glow**: `0 0 0 1px rgba(53, 109, 255, 0.2)`

#### Animation
- **Type**: Fade-in
- **Duration**: 200ms
- **Easing**: ease-out
- **Effect**: Smooth appearance on selection

```css
.annotator__selection {
  border: 2px dashed rgba(56, 105, 255, 0.95);
  animation: selectionFadeIn 200ms ease-out;
  box-shadow: 0 0 0 1px rgba(53, 109, 255, 0.2);
}

@keyframes selectionFadeIn {
  from {
    opacity: 0;
    box-shadow: 0 0 0 0 rgba(53, 109, 255, 0.3);
  }
  to {
    opacity: 1;
    box-shadow: 0 0 0 1px rgba(53, 109, 255, 0.2);
  }
}
```

### Selection Handles

#### Resize Handles
- **Position**: At corners (nw, ne, se, sw)
- **Size**: 12px × 12px
- **Color**: `#356dff`
- **Border**: 2px white
- **Shadow**: `0 1px 8px rgba(19, 31, 53, 0.24)`

#### Endpoint Handles
- **Position**: At line endpoints (start, end)
- **Size**: 14px × 14px
- **Color**: `#356dff`
- **Border**: 2px white
- **Shadow**: `0 1px 8px rgba(19, 31, 53, 0.24)`

## Drag Feedback

### Visual Feedback During Drag

#### Cursor Change
- **From**: `move` or `grab`
- **To**: `grabbing`
- **Timing**: Immediate on mousedown

#### Annotation Appearance
- **Effect**: Subtle glow during drag
- **Color**: `rgba(53, 109, 255, 0.2)`
- **Duration**: Continuous during drag

#### Position Indicator (Optional)
- **Display**: Coordinates shown during drag
- **Format**: `(x, y)` in normalized coordinates
- **Position**: Near cursor or in status bar

### Visual Feedback During Resize

#### Cursor Change
- **From**: `move`
- **To**: Resize cursor based on handle (↔, ↕, ↖, ↗, etc.)
- **Timing**: Immediate on handle mousedown

#### Dimension Indicator (Optional)
- **Display**: Width × Height shown during resize
- **Format**: `WxH` in pixels or percentage
- **Position**: Near cursor or in status bar

#### Aspect Ratio Lock (Optional)
- **Display**: Lock icon for asset/magnify types
- **Visibility**: Shown during resize
- **Position**: Near cursor or in status bar

## Animation Effects

### Selection Animation

#### Fade-In Animation
```css
@keyframes selectionFadeIn {
  from {
    opacity: 0;
    box-shadow: 0 0 0 0 rgba(53, 109, 255, 0.3);
  }
  to {
    opacity: 1;
    box-shadow: 0 0 0 1px rgba(53, 109, 255, 0.2);
  }
}
```

#### Duration: 200ms
#### Easing: ease-out

### Handle Animation

#### Hover Animation
```css
.annotator__handle:hover {
  animation: handleGrow 150ms ease-out forwards;
}

@keyframes handleGrow {
  from {
    width: 12px;
    height: 12px;
    background: #356dff;
  }
  to {
    width: 16px;
    height: 16px;
    background: #4a7dff;
  }
}
```

#### Duration: 150ms
#### Easing: ease-out

### Glow Animation

#### Active Annotation Glow
```css
.annotator__shape--active {
  filter: drop-shadow(0 0 0.45rem rgba(53, 109, 255, 0.2));
}
```

#### Hover Glow
```css
.annotator__shape:hover {
  filter: drop-shadow(0 0 0.3rem rgba(53, 109, 255, 0.15));
}
```

## Zoom Level Feedback

### Handle Scaling

#### At Different Zoom Levels
- **10% zoom**: Handles appear larger relative to annotation
- **50% zoom**: Handles at normal size
- **100% zoom**: Handles at normal size
- **200% zoom**: Handles appear smaller relative to annotation

#### Implementation
```typescript
function getHandleStyle(annotation, handle) {
  const size = 12; // Base size
  const half = size / 2;
  // Handles scale with zoom automatically via CSS
  return {
    left: `${positionMap[handle].left}px`,
    top: `${positionMap[handle].top}px`,
    cursor: positionMap[handle].cursor
  };
}
```

### Selection Border Scaling

#### At Different Zoom Levels
- **10% zoom**: Border appears thicker relative to annotation
- **50% zoom**: Border at normal thickness
- **100% zoom**: Border at normal thickness
- **200% zoom**: Border appears thinner relative to annotation

#### Implementation
- Border thickness: 2px (fixed in pixels)
- Scales visually with zoom level

## Color Feedback

### Annotation Colors

#### Default Colors
- **Stroke**: `#f2b91f` (golden yellow)
- **Fill**: `rgba(255,255,255,0.04)` (subtle white)
- **Text**: `#ffffff` (white)

#### Selected Colors
- **Border**: `rgba(56, 105, 255, 0.95)` (blue)
- **Glow**: `rgba(53, 109, 255, 0.2)` (blue glow)
- **Handle**: `#356dff` (bright blue)

#### Hover Colors
- **Glow**: `rgba(53, 109, 255, 0.15)` (subtle blue glow)
- **Handle**: `#4a7dff` (lighter blue)

### Type-Specific Colors

#### Highlight
- **Fill**: `rgba(247, 196, 34, 0.34)` (semi-transparent yellow)
- **Stroke**: `#f2b91f` (golden yellow)

#### Blur
- **Border**: `#f2b91f` (golden yellow)
- **Background**: `rgba(16, 24, 32, 0.2)` (dark semi-transparent)

#### Magnify
- **Border**: `#ffffff` (white)
- **Background**: `rgba(255, 255, 255, 0.12)` (subtle white)

#### Tooltip
- **Background**: `rgba(18,24,30,0.92)` (dark)
- **Text**: `#ffffff` (white)
- **Pointer**: Matches background color

## Accessibility Feedback

### Focus Indicators

#### Canvas Focus
- **Indicator**: Outline or border change
- **Color**: Blue (`#356dff`)
- **Visibility**: Always visible

#### Element Focus
- **Indicator**: Focus ring
- **Color**: Blue (`#356dff`)
- **Visibility**: Always visible

### Color Contrast

#### Text on Background
- **Contrast Ratio**: ≥ 4.5:1 (WCAG AA)
- **Examples**:
  - White text on dark background: ✓ Good
  - Yellow text on white background: ✗ Poor

#### Interactive Elements
- **Contrast Ratio**: ≥ 3:1 (WCAG AA)
- **Examples**:
  - Blue handle on white background: ✓ Good
  - Light gray handle on light background: ✗ Poor

## Performance Considerations

### Animation Performance

#### Smooth Animations
- **Use**: `transform` and `opacity`
- **Avoid**: `left`, `top`, `width`, `height`
- **Reason**: GPU acceleration

#### Animation Duration
- **Hover effects**: 150ms
- **Selection**: 200ms
- **Transitions**: 150-200ms

#### Frame Rate
- **Target**: 60 FPS
- **Measurement**: Use Chrome DevTools Performance tab

## Testing Visual Feedback

### Manual Testing Checklist

- [ ] Hover over annotation shows glow
- [ ] Hover over handle shows enlargement
- [ ] Selection border appears with animation
- [ ] Cursor changes appropriately
- [ ] Drag shows grabbing cursor
- [ ] Resize shows resize cursor
- [ ] Animations are smooth (60 FPS)
- [ ] Visual feedback at different zoom levels
- [ ] Color contrast meets WCAG AA

### Automated Testing

```typescript
// Test hover state
const annotation = wrapper.find('.annotator__shape');
await annotation.trigger('mouseenter');
expect(annotation.classes()).toContain('annotator__shape--hover');

// Test selection animation
const selection = wrapper.find('.annotator__selection');
expect(selection.classes()).toContain('selectionFadeIn');

// Test cursor change
expect(wrapper.vm.currentCursor).toBe('grabbing');
```

## Related Documentation

- [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md)
- [Performance Guide](./PERFORMANCE_GUIDE.md)
- [Interaction Patterns](./INTERACTION_PATTERNS.md)
- [Accessibility Guide](./ACCESSIBILITY_GUIDE.md)

