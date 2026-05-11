import { describe, it, expect } from 'vitest';
import type { StepAnnotation } from '../contracts';
import {
    createAnnotationId,
    getAnnotationBounds,
    normalizeStepAnnotation,
    normalizeStepAnnotations,
    withUpdatedAnnotationOrder,
    isAreaAnnotation,
    cropStepAnnotations,
    translateBrushAnnotation,
    resizeBrushAnnotation,
} from '../step-annotations';

describe('Annotation Utilities', () => {
    describe('createAnnotationId', () => {
        it('should create unique IDs', () => {
            const id1 = createAnnotationId();
            const id2 = createAnnotationId();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^annotation_\d+_[a-z0-9]+$/);
        });
    });

    describe('getAnnotationBounds', () => {
        it('should return bounds for rectangle annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
            };
            const bounds = getAnnotationBounds(annotation);
            expect(bounds.x).toBe(0.1);
            expect(bounds.y).toBe(0.2);
            expect(bounds.width).toBe(0.3);
            expect(bounds.height).toBe(0.4);
        });

        it('should enforce minimum size for area annotations', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.5,
                y: 0.5,
                width: 0.001,
                height: 0.001,
            };
            const bounds = getAnnotationBounds(annotation);
            expect(bounds.width).toBeGreaterThanOrEqual(0.012);
            expect(bounds.height).toBeGreaterThanOrEqual(0.012);
        });

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

        it('should calculate bounds for line annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'line',
                x: 0.1,
                y: 0.2,
                x2: 0.5,
                y2: 0.6,
            };
            const bounds = getAnnotationBounds(annotation);
            expect(bounds.x).toBe(0.1);
            expect(bounds.y).toBe(0.2);
            expect(bounds.width).toBeCloseTo(0.4, 5);
            expect(bounds.height).toBeCloseTo(0.4, 5);
        });

        it('should calculate bounds for click annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'click',
                x: 0.5,
                y: 0.5,
            };
            const bounds = getAnnotationBounds(annotation);
            expect(bounds.width).toBe(0.06);
            expect(bounds.height).toBe(0.06);
        });

        it('should calculate bounds for brush annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'brush',
                x: 0.1,
                y: 0.1,
                points: [
                    { x: 0.1, y: 0.1 },
                    { x: 0.3, y: 0.3 },
                    { x: 0.5, y: 0.2 },
                ],
            };
            const bounds = getAnnotationBounds(annotation);
            expect(bounds.x).toBe(0.1);
            expect(bounds.y).toBe(0.1);
            expect(bounds.width).toBeGreaterThan(0);
            expect(bounds.height).toBeGreaterThan(0);
        });
    });

    describe('normalizeStepAnnotation', () => {
        it('should normalize rectangle annotation with defaults', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.1,
                y: 0.2,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.color).toBe('#f2b91f');
            expect(normalized.strokeWidth).toBe(3);
            expect(normalized.opacity).toBe(1);
            expect(normalized.order).toBe(0);
        });

        it('should normalize highlight annotation with correct opacity', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'highlight',
                x: 0.1,
                y: 0.2,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.opacity).toBe(0.34);
        });

        it('should normalize text annotation with default text', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'text',
                x: 0.1,
                y: 0.2,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.text).toBe('Add text');
        });

        it('should normalize tooltip annotation with default text', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'tooltip',
                x: 0.1,
                y: 0.2,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.text).toBe('Explain this area');
        });

        it('should normalize arrow annotation with end arrowhead', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'arrow',
                x: 0.1,
                y: 0.2,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.showArrowHeadEnd).toBe(true);
            expect(normalized.showArrowHeadStart).toBe(false);
        });

        it('should normalize line annotation without arrowheads', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'line',
                x: 0.1,
                y: 0.2,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.showArrowHeadEnd).toBe(false);
            expect(normalized.showArrowHeadStart).toBe(false);
        });

        it('should normalize magnify annotation with correct defaults', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'magnify',
                x: 0.1,
                y: 0.2,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.magnifyZoom).toBe(1.8);
            expect(normalized.radius).toBe(999);
            expect(normalized.shadow).toBe(true);
        });

        it('should normalize cursor annotation with pointer variant', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'cursor',
                x: 0.1,
                y: 0.2,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.cursorVariant).toBe('pointer');
        });

        it('should clamp out-of-range values', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 1.5,
                y: -0.5,
                width: 2,
                height: -1,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.x).toBeGreaterThanOrEqual(0);
            expect(normalized.x).toBeLessThanOrEqual(1);
            expect(normalized.y).toBeGreaterThanOrEqual(0);
            expect(normalized.y).toBeLessThanOrEqual(1);
            expect(normalized.width).toBeGreaterThanOrEqual(0.012);
            expect(normalized.height).toBeGreaterThanOrEqual(0.012);
        });

        it('should normalize rotation into a stable degree range', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.1,
                y: 0.2,
                rotation: 450,
            };
            const normalized = normalizeStepAnnotation(annotation);
            expect(normalized.rotation).toBe(90);
        });
    });

    describe('normalizeStepAnnotations', () => {
        it('should normalize multiple annotations', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2 },
                { id: '2', type: 'ellipse', x: 0.3, y: 0.4 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            expect(normalized).toHaveLength(2);
            expect(normalized[0].order).toBe(0);
            expect(normalized[1].order).toBe(1);
        });

        it('should auto-number click annotations', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'click', x: 0.1, y: 0.2 },
                { id: '2', type: 'click', x: 0.3, y: 0.4 },
                { id: '3', type: 'rect', x: 0.5, y: 0.6 },
                { id: '4', type: 'click', x: 0.7, y: 0.8 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            expect(normalized[0].number).toBe(1);
            expect(normalized[1].number).toBe(2);
            expect(normalized[2].number).toBeNull();
            expect(normalized[3].number).toBe(3);
        });

        it('should sort by order field', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, order: 2 },
                { id: '2', type: 'ellipse', x: 0.3, y: 0.4, order: 0 },
                { id: '3', type: 'line', x: 0.5, y: 0.6, order: 1 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            expect(normalized[0].id).toBe('2');
            expect(normalized[1].id).toBe('3');
            expect(normalized[2].id).toBe('1');
        });

        it('should handle empty array', () => {
            const normalized = normalizeStepAnnotations([]);
            expect(normalized).toEqual([]);
        });

        it('should handle null input', () => {
            const normalized = normalizeStepAnnotations(null);
            expect(normalized).toEqual([]);
        });
    });

    describe('withUpdatedAnnotationOrder', () => {
        it('should update order for multiple annotations', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, order: 5 },
                { id: '2', type: 'ellipse', x: 0.3, y: 0.4, order: 3 },
            ];
            const updated = withUpdatedAnnotationOrder(annotations);
            expect(updated[0].order).toBe(0);
            expect(updated[1].order).toBe(1);
        });
    });

    describe('isAreaAnnotation', () => {
        it('should identify area annotation types', () => {
            expect(isAreaAnnotation('rect')).toBe(true);
            expect(isAreaAnnotation('ellipse')).toBe(true);
            expect(isAreaAnnotation('text')).toBe(true);
            expect(isAreaAnnotation('blur')).toBe(true);
            expect(isAreaAnnotation('highlight')).toBe(true);
            expect(isAreaAnnotation('magnify')).toBe(true);
            expect(isAreaAnnotation('cursor')).toBe(true);
            expect(isAreaAnnotation('asset')).toBe(true);
            expect(isAreaAnnotation('tooltip')).toBe(true);
        });

        it('should identify non-area annotation types', () => {
            expect(isAreaAnnotation('line')).toBe(false);
            expect(isAreaAnnotation('arrow')).toBe(false);
            expect(isAreaAnnotation('brush')).toBe(false);
            expect(isAreaAnnotation('click')).toBe(false);
        });
    });

    describe('cropStepAnnotations', () => {
        it('should crop rectangle annotation', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
            ];
            const selection = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
            const cropped = cropStepAnnotations(annotations, selection);
            expect(cropped).toHaveLength(1);
            expect(cropped[0].x).toBeGreaterThanOrEqual(0);
            expect(cropped[0].y).toBeGreaterThanOrEqual(0);
        });

        it('should remove annotations outside selection', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.7, y: 0.7, width: 0.2, height: 0.2 },
            ];
            const selection = { x: 0.1, y: 0.1, width: 0.4, height: 0.4 };
            const cropped = cropStepAnnotations(annotations, selection);
            expect(cropped).toHaveLength(0);
        });

        it('should crop click annotation', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'click', x: 0.3, y: 0.3 },
            ];
            const selection = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
            const cropped = cropStepAnnotations(annotations, selection);
            expect(cropped).toHaveLength(1);
        });

        it('should crop line annotation', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'line', x: 0.15, y: 0.15, x2: 0.45, y2: 0.45 },
            ];
            const selection = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };
            const cropped = cropStepAnnotations(annotations, selection);
            expect(cropped).toHaveLength(1);
        });

        it('should crop brush annotation', () => {
            const annotations: StepAnnotation[] = [
                {
                    id: '1',
                    type: 'brush',
                    x: 0.1,
                    y: 0.1,
                    points: [
                        { x: 0.2, y: 0.2 },
                        { x: 0.3, y: 0.3 },
                        { x: 0.4, y: 0.4 },
                    ],
                },
            ];
            const selection = { x: 0.15, y: 0.15, width: 0.4, height: 0.4 };
            const cropped = cropStepAnnotations(annotations, selection);
            expect(cropped).toHaveLength(1);
        });
    });

    describe('translateBrushAnnotation', () => {
        it('should translate brush annotation', () => {
            const annotation: StepAnnotation = {
                id: '1',
                type: 'brush',
                x: 0.1,
                y: 0.1,
                points: [
                    { x: 0.1, y: 0.1 },
                    { x: 0.2, y: 0.2 },
                ],
            };
            const translated = translateBrushAnnotation(annotation, 0.1, 0.1);
            expect(translated.x).toBeGreaterThan(0.1);
            expect(translated.y).toBeGreaterThan(0.1);
        });

        it('should clamp translated points to [0, 1]', () => {
            const annotation: StepAnnotation = {
                id: '1',
                type: 'brush',
                x: 0.9,
                y: 0.9,
                points: [
                    { x: 0.9, y: 0.9 },
                    { x: 1.0, y: 1.0 },
                ],
            };
            const translated = translateBrushAnnotation(annotation, 0.2, 0.2);
            expect(translated.x).toBeLessThanOrEqual(1);
            expect(translated.y).toBeLessThanOrEqual(1);
        });
    });

    describe('resizeBrushAnnotation', () => {
        it('should resize brush annotation', () => {
            const annotation: StepAnnotation = {
                id: '1',
                type: 'brush',
                x: 0.1,
                y: 0.1,
                width: 0.2,
                height: 0.2,
                points: [
                    { x: 0.1, y: 0.1 },
                    { x: 0.3, y: 0.3 },
                ],
            };
            const resized = resizeBrushAnnotation(annotation, {
                x: 0.2,
                y: 0.2,
                width: 0.4,
                height: 0.4,
            });
            expect(resized.width).toBeCloseTo(0.4, 5);
            expect(resized.height).toBeCloseTo(0.4, 5);
        });
    });

    describe('Bounds Normalization Property', () => {
        it('should always normalize bounds to [0, 1] range', () => {
            const testCases: StepAnnotation[] = [
                { id: '1', type: 'rect', x: -0.5, y: -0.5, width: 0.5, height: 0.5 },
                { id: '2', type: 'rect', x: 0.8, y: 0.8, width: 0.5, height: 0.5 },
                { id: '3', type: 'rect', x: 0.5, y: 0.5, width: 2, height: 2 },
            ];

            testCases.forEach((annotation) => {
                const normalized = normalizeStepAnnotation(annotation);
                expect(normalized.x).toBeGreaterThanOrEqual(0);
                expect(normalized.x).toBeLessThanOrEqual(1);
                expect(normalized.y).toBeGreaterThanOrEqual(0);
                expect(normalized.y).toBeLessThanOrEqual(1);
                expect(normalized.width).toBeGreaterThanOrEqual(0.012);
                expect(normalized.width).toBeLessThanOrEqual(1);
                expect(normalized.height).toBeGreaterThanOrEqual(0.012);
                expect(normalized.height).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('Minimum Size Enforcement Property', () => {
        it('should enforce minimum size of 0.012', () => {
            const testCases: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.5, y: 0.5, width: 0.001, height: 0.001 },
                { id: '2', type: 'ellipse', x: 0.5, y: 0.5, width: 0, height: 0 },
                { id: '3', type: 'text', x: 0.5, y: 0.5, width: 0.005, height: 0.005 },
            ];

            testCases.forEach((annotation) => {
                const normalized = normalizeStepAnnotation(annotation);
                expect(normalized.width).toBeGreaterThanOrEqual(0.012);
                expect(normalized.height).toBeGreaterThanOrEqual(0.012);
            });
        });
    });
});
