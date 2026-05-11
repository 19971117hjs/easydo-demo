# Performance Optimization Guide

## Overview

This guide covers performance optimization strategies for the annotation system, including rendering optimization, memory management, and interaction smoothness.

## Performance Targets

- **60 FPS** during drag operations
- **<100ms** annotation creation time
- **<50ms** selection change time
- **Smooth** zoom transitions
- **No lag** with 50+ annotations

## Rendering Optimization

### SVG Rendering

#### Current Approach
- Vector shapes rendered in SVG (rect, ellipse, line, arrow, brush, text, highlight)
- HTML div for raster effects (blur, magnify, tooltip, asset)
- Separate selection UI overlay

#### Optimization Strategies

1. **CSS Classes Instead of Inline Styles**
   ```vue
   <!-- Before: Inline styles -->
   <rect :style="{ fill: color, stroke: strokeColor, ... }" />
   
   <!-- After: CSS classes -->
   <rect :class="['shape', `shape--${type}`]" />
   ```

2. **Batch SVG Updates**
   - Collect multiple changes before re-rendering
   - Use `requestAnimationFrame` for smooth animations
   - Debounce frequent updates

3. **Viewport Culling**
   - Only render visible annotations
   - Skip rendering off-screen annotations
   - Implement lazy rendering for large counts

### HTML Rendering

#### Optimization Strategies

1. **Efficient DOM Updates**
   - Use `v-if` for conditional rendering
   - Use `v-show` for frequent toggles
   - Minimize DOM reflows

2. **CSS Transforms**
   - Use `transform` instead of `left`/`top` for positioning
   - Use `will-change` for animated elements
   - Leverage GPU acceleration

3. **Backdrop Filter Optimization**
   - Use `backdrop-filter` for blur effects
   - Limit blur radius to necessary values
   - Consider performance on lower-end devices

## Memoization & Caching

### Computed Properties

#### Current Implementation
```typescript
const displayAnnotations = computed(() => {
  return workingAnnotations.value.map((annotation) => {
    const bounds = getAnnotationBounds(annotation);
    return {
      ...annotation,
      bounds,
      px: { /* pixel calculations */ }
    };
  });
});
```

#### Optimization Opportunities

1. **Cache Bounds Calculations**
   ```typescript
   const boundsCache = new Map<string, Bounds>();
   
   function getCachedBounds(annotation: StepAnnotation): Bounds {
     if (!boundsCache.has(annotation.id)) {
       boundsCache.set(annotation.id, getAnnotationBounds(annotation));
     }
     return boundsCache.get(annotation.id)!;
   }
   ```

2. **Memoize Display Annotations**
   - Cache display annotation objects
   - Invalidate cache only when annotations change
   - Reuse objects when possible

3. **Lazy Evaluation**
   - Defer expensive calculations
   - Calculate only when needed
   - Use `computed` with dependencies

### Function Memoization

#### Example: Bounds Calculation
```typescript
const memoizedGetBounds = (() => {
  const cache = new WeakMap<StepAnnotation, Bounds>();
  
  return (annotation: StepAnnotation): Bounds => {
    if (!cache.has(annotation)) {
      cache.set(annotation, getAnnotationBounds(annotation));
    }
    return cache.get(annotation)!;
  };
})();
```

## Lazy Rendering

### Off-Screen Annotation Rendering

#### Strategy
1. Calculate viewport bounds
2. Check if annotation is visible
3. Only render visible annotations
4. Defer rendering of off-screen annotations

#### Implementation
```typescript
const visibleAnnotations = computed(() => {
  return displayAnnotations.value.filter((annotation) => {
    const { x, y, width, height } = annotation.bounds;
    // Check if annotation intersects with viewport
    return (
      x + width > 0 &&
      x < 1 &&
      y + height > 0 &&
      y < 1
    );
  });
});
```

### Virtual Scrolling

#### For Annotation Lists
- Implement virtual scrolling for annotation list
- Only render visible items in list
- Improves performance with 100+ annotations

## Interaction Performance

### Drag Operations

#### Current Approach
- Window-level event tracking
- Real-time position updates
- Immediate re-rendering

#### Optimization Strategies

1. **RequestAnimationFrame**
   ```typescript
   let pendingUpdate = false;
   
   function handleWindowMouseMove(event: MouseEvent): void {
     if (!pendingUpdate) {
       pendingUpdate = true;
       requestAnimationFrame(() => {
         // Update position
         pendingUpdate = false;
       });
     }
   }
   ```

2. **Debouncing**
   - Debounce frequent updates
   - Batch multiple changes
   - Reduce re-render frequency

3. **Snapshot-Based Updates**
   - Use original annotation snapshot
   - Calculate delta from start point
   - Avoid recalculating from current state

### Resize Operations

#### Optimization Strategies

1. **Aspect Ratio Preservation**
   - Cache aspect ratio calculation
   - Reuse cached value during resize
   - Avoid recalculating on every move

2. **Bounds Clamping**
   - Pre-calculate valid bounds
   - Clamp values efficiently
   - Avoid unnecessary calculations

## Memory Optimization

### Annotation Pooling

#### Strategy
- Reuse annotation objects during interaction
- Avoid creating new objects frequently
- Clean up unused objects

#### Implementation
```typescript
class AnnotationPool {
  private pool: StepAnnotation[] = [];
  
  acquire(): StepAnnotation {
    return this.pool.pop() || createEmptyAnnotation();
  }
  
  release(annotation: StepAnnotation): void {
    this.pool.push(annotation);
  }
}
```

### Event Delegation

#### Strategy
- Single listener for all shapes
- Delegate events to specific handlers
- Reduce listener count

#### Current Implementation
- Per-shape listeners (one per annotation)
- Could be optimized with event delegation

### Cleanup

#### On Component Unmount
```typescript
onBeforeUnmount(() => {
  stopWindowTracking();
  // Clear caches
  boundsCache.clear();
  // Remove event listeners
  // Clean up resources
});
```

## Performance Monitoring

### Metrics to Track

1. **Rendering Performance**
   - Frame rate (FPS) during drag
   - Time to render frame
   - Time to update annotations

2. **Interaction Performance**
   - Time to create annotation
   - Time to select annotation
   - Time to move annotation
   - Time to resize annotation

3. **Memory Usage**
   - Heap size
   - Memory growth over time
   - Garbage collection frequency

### Profiling Tools

1. **Chrome DevTools**
   - Performance tab
   - Rendering tab
   - Memory tab

2. **Vue DevTools**
   - Component performance
   - Computed property tracking
   - Event tracking

## Performance Testing

### Test Scenarios

1. **Large Annotation Count**
   - Create 50+ annotations
   - Measure drag FPS
   - Measure selection change time

2. **Complex Interactions**
   - Drag multiple annotations
   - Resize while zooming
   - Edit text while dragging

3. **Zoom Transitions**
   - Zoom in/out rapidly
   - Measure transition smoothness
   - Check for jank

### Performance Benchmarks

```typescript
// Measure annotation creation time
const start = performance.now();
createAnnotation(...);
const duration = performance.now() - start;
console.log(`Creation time: ${duration}ms`);

// Measure selection change time
const start = performance.now();
setSelectedId(id);
const duration = performance.now() - start;
console.log(`Selection time: ${duration}ms`);

// Measure drag FPS
let frameCount = 0;
let lastTime = performance.now();

function measureFPS() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    console.log(`FPS: ${frameCount}`);
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(measureFPS);
}
```

## Optimization Checklist

### Rendering
- [ ] Use CSS classes instead of inline styles
- [ ] Implement viewport culling
- [ ] Use `transform` instead of `left`/`top`
- [ ] Leverage GPU acceleration
- [ ] Batch SVG updates

### Memoization
- [ ] Cache bounds calculations
- [ ] Memoize display annotations
- [ ] Cache aspect ratios
- [ ] Lazy evaluate expensive functions

### Lazy Rendering
- [ ] Implement off-screen culling
- [ ] Defer rendering of hidden annotations
- [ ] Use virtual scrolling for lists

### Interaction
- [ ] Use `requestAnimationFrame`
- [ ] Debounce frequent updates
- [ ] Use snapshot-based updates
- [ ] Optimize resize calculations

### Memory
- [ ] Implement annotation pooling
- [ ] Use event delegation
- [ ] Clean up on unmount
- [ ] Monitor memory usage

## Performance Targets Status

| Target | Current | Status |
|--------|---------|--------|
| 60 FPS drag | TBD | ⏳ Testing |
| <100ms creation | TBD | ⏳ Testing |
| <50ms selection | TBD | ⏳ Testing |
| Smooth zoom | TBD | ⏳ Testing |
| 50+ annotations | TBD | ⏳ Testing |

## Related Documentation

- [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md)
- [Interaction Patterns](./INTERACTION_PATTERNS.md)
- [Accessibility Guide](./ACCESSIBILITY_GUIDE.md)

