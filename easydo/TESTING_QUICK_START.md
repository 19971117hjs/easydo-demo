# Testing Quick Start Guide

## 🚀 Getting Started

### Run All Tests
```bash
pnpm test
```

### Run Tests in Watch Mode (Auto-rerun on changes)
```bash
pnpm test:watch
```

### Run Tests with UI Dashboard
```bash
pnpm test:ui
```

### Run Specific Test File
```bash
pnpm test src/shared/__tests__/step-annotations.test.ts
```

### Run Tests Matching Pattern
```bash
pnpm test -- --grep "Rectangle"
```

## 📊 Test Results

```
✓ src/shared/__tests__/step-annotations.test.ts (34 tests)
✓ src/shared/__tests__/annotation-interactions.test.ts (19 tests)
✓ src/renderer/src/components/__tests__/ScreenshotAnnotator.test.ts (46 tests)

Test Files: 3 passed (3)
Tests: 99 passed (99)
Duration: ~263ms
```

## 📁 Test Files

### 1. Annotation Utilities
**Location**: `src/shared/__tests__/step-annotations.test.ts`

Tests for core annotation functions:
- `createAnnotationId()` - Generate unique IDs
- `getAnnotationBounds()` - Calculate bounds
- `normalizeStepAnnotation()` - Normalize single annotation
- `normalizeStepAnnotations()` - Normalize multiple annotations
- `withUpdatedAnnotationOrder()` - Update z-order
- `isAreaAnnotation()` - Type classification
- `cropStepAnnotations()` - Crop operations
- `translateBrushAnnotation()` - Brush translation
- `resizeBrushAnnotation()` - Brush resizing

**Run**: `pnpm test src/shared/__tests__/step-annotations.test.ts`

### 2. Component Tests
**Location**: `src/renderer/src/components/__tests__/ScreenshotAnnotator.test.ts`

Tests for ScreenshotAnnotator component:
- Annotation creation for all 13 types
- Selection management
- Move interaction
- Resize interaction
- Delete operation
- Layer management
- Keyboard shortcuts
- Focus management
- Property editing

**Run**: `pnpm test src/renderer/src/components/__tests__/ScreenshotAnnotator.test.ts`

### 3. Interaction Patterns
**Location**: `src/shared/__tests__/annotation-interactions.test.ts`

Tests for interaction patterns:
- Move interaction (size preservation)
- Resize interaction (minimum size, aspect ratio)
- Delete operation (order consistency)
- Layer management (z-order)
- Selection management (uniqueness)
- Bounds normalization
- Click auto-numbering
- Crop operations
- Multi-annotation workflows

**Run**: `pnpm test src/shared/__tests__/annotation-interactions.test.ts`

## 🧪 Test Examples

### Example 1: Testing Rectangle Creation
```typescript
it('should create rectangle annotation with correct defaults', () => {
  const annotation: StepAnnotation = {
    id: 'test',
    type: 'rect',
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.4,
  };
  const normalized = normalizeStepAnnotations([annotation]);
  expect(normalized[0].type).toBe('rect');
  expect(normalized[0].color).toBe('#f2b91f');
  expect(normalized[0].strokeWidth).toBe(3);
});
```

### Example 2: Testing Bounds Normalization
```typescript
it('should clamp bounds to [0, 1] range', () => {
  const annotation: StepAnnotation = {
    id: 'test',
    type: 'rect',
    x: -0.1,
    y: 1.5,
    width: 0.3,
    height: 0.4,
  };
  const bounds = getAnnotationBounds(annotation);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x).toBeLessThanOrEqual(1);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeLessThanOrEqual(1);
});
```

### Example 3: Testing Move Preserves Size
```typescript
it('should preserve size when moving rectangle', () => {
  const annotation: StepAnnotation = {
    id: 'test',
    type: 'rect',
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.4,
  };
  const normalized = normalizeStepAnnotations([annotation]);
  const original = normalized[0];

  const moved = {
    ...original,
    x: 0.5,
    y: 0.6,
  };

  expect(moved.width).toBe(original.width);
  expect(moved.height).toBe(original.height);
});
```

## 🎯 Test Coverage by Annotation Type

### Rectangle (8 tests)
- ✅ Creation with defaults
- ✅ Bounds calculation
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Property editing
- ✅ Bounds normalization
- ✅ Minimum size enforcement

### Ellipse (7 tests)
- ✅ Creation with defaults
- ✅ Bounds calculation
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Property editing
- ✅ Bounds normalization

### Highlight (6 tests)
- ✅ Creation with opacity (0.34)
- ✅ Bounds calculation
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Property editing

### Text (8 tests)
- ✅ Creation with default text
- ✅ Text content editing
- ✅ Font size control
- ✅ Font weight control
- ✅ Text color control
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation

### Tooltip (8 tests)
- ✅ Creation with default text
- ✅ Tooltip placement control
- ✅ Shadow effect
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Property editing
- ✅ Bounds normalization

### Blur (6 tests)
- ✅ Creation with blur amount
- ✅ Blur amount control (0-20px)
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Property editing

### Magnify (7 tests)
- ✅ Creation with zoom level
- ✅ Magnify zoom control (1.2-4x)
- ✅ Aspect ratio preservation
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Shadow effect

### Arrow (7 tests)
- ✅ Creation with arrowhead
- ✅ Arrowhead visibility control
- ✅ Line style control
- ✅ Endpoint dragging
- ✅ Move interaction
- ✅ Delete operation
- ✅ Property editing

### Line (7 tests)
- ✅ Creation without arrowhead
- ✅ Line style control
- ✅ Endpoint dragging
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Property editing

### Brush (8 tests)
- ✅ Creation with freehand path
- ✅ Point sampling
- ✅ Bounding box calculation
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Property editing
- ✅ Bounds normalization

### Click (8 tests)
- ✅ Creation with auto-numbering
- ✅ Number auto-increment
- ✅ Cursor variant control
- ✅ Move interaction
- ✅ Delete operation
- ✅ Multiple clicks
- ✅ Property editing
- ✅ Bounds normalization

### Cursor (7 tests)
- ✅ Creation with cursor variant
- ✅ Cursor variant control (pointer/text/hand)
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Property editing
- ✅ Bounds normalization

### Asset (7 tests)
- ✅ Creation with asset reference
- ✅ Aspect ratio preservation
- ✅ Move interaction
- ✅ Resize interaction
- ✅ Delete operation
- ✅ Property editing
- ✅ Bounds normalization

## 🔍 Debugging Tests

### Run Single Test
```bash
pnpm test -- --grep "should create rectangle"
```

### Run Tests with Verbose Output
```bash
pnpm test -- --reporter=verbose
```

### Run Tests with Coverage
```bash
pnpm test -- --coverage
```

### Watch Specific File
```bash
pnpm test:watch src/shared/__tests__/step-annotations.test.ts
```

## 📝 Writing New Tests

### Test Structure
```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../module';

describe('Feature Name', () => {
  describe('Specific Behavior', () => {
    it('should do something specific', () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Common Assertions
```typescript
expect(value).toBe(expected);           // Exact equality
expect(value).toEqual(expected);        // Deep equality
expect(value).toBeGreaterThan(5);       // Numeric comparison
expect(value).toBeCloseTo(0.4, 5);      // Floating point
expect(array).toHaveLength(3);          // Array length
expect(value).toBeDefined();            // Not undefined
expect(value).toBeNull();               // Is null
expect(value).toBeTruthy();             // Truthy value
expect(value).toMatch(/pattern/);       // Regex match
```

## 🚨 Common Issues

### Issue: Tests not found
**Solution**: Make sure test files are in `__tests__` directory with `.test.ts` suffix

### Issue: Import errors
**Solution**: Check path aliases in `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, './src/shared'),
    '@renderer': path.resolve(__dirname, './src/renderer/src'),
  },
}
```

### Issue: Floating point precision
**Solution**: Use `toBeCloseTo()` for floating point comparisons:
```typescript
expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
```

## 📚 Resources

- **Vitest Docs**: https://vitest.dev/
- **Vue Test Utils**: https://test-utils.vuejs.org/
- **Testing Library**: https://testing-library.com/

## 🎯 Next Steps

1. **Run Tests**: `pnpm test`
2. **Watch Mode**: `pnpm test:watch`
3. **Add Tests**: Create new test files in `__tests__` directories
4. **Review Coverage**: Check test results in console

## ✅ Checklist

- [ ] Run `pnpm test` to verify all tests pass
- [ ] Review test files in `__tests__` directories
- [ ] Check test coverage for your changes
- [ ] Add tests for new features
- [ ] Run tests before committing

---

**Happy Testing! 🧪**
