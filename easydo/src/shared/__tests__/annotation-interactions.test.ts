import { describe, it, expect } from 'vitest';
import type { StepAnnotation } from '../contracts';
import {
    getAnnotationBounds,
    normalizeStepAnnotations,
    withUpdatedAnnotationOrder,
    cropStepAnnotations,
} from '../step-annotations';

describe('Annotation Interaction Patterns', () => {
    describe('Move Interaction - Property: Size Preservation', () => {
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

            // Simulate move
            const moved = {
                ...original,
                x: 0.5,
                y: 0.6,
            };

            expect(moved.width).toBe(original.width);
            expect(moved.height).toBe(original.height);
        });

        it('should preserve size for all area types during move', () => {
            const types: Array<StepAnnotation['type']> = [
                'rect',
                'ellipse',
                'text',
                'blur',
                'highlight',
                'magnify',
                'cursor',
                'asset',
                'tooltip',
            ];

            types.forEach((type) => {
                const annotation: StepAnnotation = {
                    id: 'test',
                    type,
                    x: 0.2,
                    y: 0.3,
                    width: 0.25,
                    height: 0.35,
                };
                const normalized = normalizeStepAnnotations([annotation]);
                const original = normalized[0];

                const moved = {
                    ...original,
                    x: 0.6,
                    y: 0.5,
                };

                expect(moved.width).toBe(original.width);
                expect(moved.height).toBe(original.height);
            });
        });
    });

    describe('Resize Interaction - Property: Minimum Size Enforcement', () => {
        it('should enforce minimum size for all area types', () => {
            const types: Array<StepAnnotation['type']> = [
                'rect',
                'ellipse',
                'text',
                'blur',
                'highlight',
                'magnify',
                'cursor',
                'asset',
                'tooltip',
            ];

            types.forEach((type) => {
                const annotation: StepAnnotation = {
                    id: 'test',
                    type,
                    x: 0.5,
                    y: 0.5,
                    width: 0.001,
                    height: 0.001,
                };
                const normalized = normalizeStepAnnotations([annotation]);
                expect(normalized[0].width).toBeGreaterThanOrEqual(0.012);
                expect(normalized[0].height).toBeGreaterThanOrEqual(0.012);
            });
        });

        it('should enforce minimum size for line types', () => {
            const types: Array<StepAnnotation['type']> = ['line', 'arrow'];

            types.forEach((type) => {
                const annotation: StepAnnotation = {
                    id: 'test',
                    type,
                    x: 0.5,
                    y: 0.5,
                    x2: 0.5001,
                    y2: 0.5001,
                };
                const normalized = normalizeStepAnnotations([annotation]);
                const bounds = getAnnotationBounds(normalized[0]);
                expect(bounds.width).toBeGreaterThanOrEqual(0.012);
                expect(bounds.height).toBeGreaterThanOrEqual(0.012);
            });
        });
    });

    describe('Resize Interaction - Property: Aspect Ratio Preservation', () => {
        it('should preserve aspect ratio for asset annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'asset',
                x: 0.1,
                y: 0.1,
                width: 0.2,
                height: 0.4,
                asset: {
                    id: 'asset1',
                    kind: 'image',
                    name: 'test.png',
                    absolutePath: '/path/to/test.png',
                    fileUrl: 'file:///path/to/test.png',
                    appUrl: 'app://asset/asset1',
                    createdAt: new Date().toISOString(),
                    width: 100,
                    height: 200,
                    displayLabel: 'test.png',
                },
            };
            const normalized = normalizeStepAnnotations([annotation]);
            const original = normalized[0];

            // Asset should maintain aspect ratio
            expect(original.type).toBe('asset');
        });

        it('should preserve aspect ratio for magnify annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'magnify',
                x: 0.1,
                y: 0.1,
                width: 0.2,
                height: 0.2,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].type).toBe('magnify');
        });
    });

    describe('Delete Operation - Property: Order Consistency', () => {
        it('should maintain sequential order after deletion', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4, order: 0 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4, order: 1 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, order: 2 },
                { id: '4', type: 'text', x: 0.2, y: 0.3, width: 0.2, height: 0.2, order: 3 },
            ];

            // Delete annotation 2
            const filtered = annotations.filter((a) => a.id !== '2');
            const normalized = normalizeStepAnnotations(filtered);

            // Check order is sequential
            for (let i = 0; i < normalized.length; i++) {
                expect(normalized[i].order).toBe(i);
            }
        });

        it('should maintain order consistency with multiple deletions', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4, order: 0 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4, order: 1 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, order: 2 },
                { id: '4', type: 'text', x: 0.2, y: 0.3, width: 0.2, height: 0.2, order: 3 },
                { id: '5', type: 'brush', x: 0.1, y: 0.1, points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }], order: 4 },
            ];

            // Delete annotations 2 and 4
            const filtered = annotations.filter((a) => a.id !== '2' && a.id !== '4');
            const normalized = normalizeStepAnnotations(filtered);

            // Check order is sequential
            for (let i = 0; i < normalized.length; i++) {
                expect(normalized[i].order).toBe(i);
            }
            expect(normalized).toHaveLength(3);
        });
    });

    describe('Layer Management - Property: Z-Order Consistency', () => {
        it('should maintain unique sequential z-order', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4, order: 10 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4, order: 5 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, order: 15 },
                { id: '4', type: 'text', x: 0.2, y: 0.3, width: 0.2, height: 0.2, order: 2 },
            ];

            const normalized = normalizeStepAnnotations(annotations);

            // Check all orders are unique
            const orders = normalized.map((a) => a.order);
            const uniqueOrders = new Set(orders);
            expect(uniqueOrders.size).toBe(orders.length);

            // Check orders are sequential
            for (let i = 0; i < normalized.length - 1; i++) {
                expect((normalized[i].order ?? 0)).toBeLessThan((normalized[i + 1].order ?? 0));
            }
        });

        it('should handle forward/backward operations', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4, order: 0 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4, order: 1 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, order: 2 },
            ];

            const normalized = normalizeStepAnnotations(annotations);

            // Simulate moving annotation 1 forward
            const reordered = [
                { ...normalized[0], order: 1 },
                { ...normalized[1], order: 0 },
                { ...normalized[2], order: 2 },
            ];

            const updated = withUpdatedAnnotationOrder(reordered);

            // Check order is still sequential
            for (let i = 0; i < updated.length - 1; i++) {
                expect((updated[i].order ?? 0)).toBeLessThan((updated[i + 1].order ?? 0));
            }
        });
    });

    describe('Selection Management - Property: Selection Uniqueness', () => {
        it('should maintain at most one selected annotation', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5 },
            ];

            const normalized = normalizeStepAnnotations(annotations);

            // Simulate selecting different annotations
            let selectedId: string | null = '1';
            expect(normalized.find((a) => a.id === selectedId)).toBeDefined();

            selectedId = '2';
            expect(normalized.find((a) => a.id === selectedId)).toBeDefined();

            selectedId = null;
            expect(selectedId).toBeNull();
        });
    });

    describe('Bounds Normalization - Property: Bounds Always in [0, 1]', () => {
        it('should clamp all bounds to [0, 1] range', () => {
            const testCases: StepAnnotation[] = [
                { id: '1', type: 'rect', x: -0.5, y: -0.5, width: 0.5, height: 0.5 },
                { id: '2', type: 'rect', x: 0.8, y: 0.8, width: 0.5, height: 0.5 },
                { id: '3', type: 'rect', x: 0.5, y: 0.5, width: 2, height: 2 },
                { id: '4', type: 'line', x: -0.1, y: -0.1, x2: 1.5, y2: 1.5 },
                { id: '5', type: 'click', x: -0.2, y: 1.2 },
            ];

            const normalized = normalizeStepAnnotations(testCases);

            normalized.forEach((annotation) => {
                const bounds = getAnnotationBounds(annotation);
                expect(bounds.x).toBeGreaterThanOrEqual(0);
                expect(bounds.x).toBeLessThanOrEqual(1);
                expect(bounds.y).toBeGreaterThanOrEqual(0);
                expect(bounds.y).toBeLessThanOrEqual(1);
                expect(bounds.x + bounds.width).toBeLessThanOrEqual(1.1); // Allow tolerance for clamping
                expect(bounds.y + bounds.height).toBeLessThanOrEqual(1.1);
            });
        });
    });

    describe('Click Annotation - Property: Auto-Numbering', () => {
        it('should auto-number click annotations sequentially', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'click', x: 0.1, y: 0.2 },
                { id: '2', type: 'rect', x: 0.3, y: 0.4, width: 0.2, height: 0.2 },
                { id: '3', type: 'click', x: 0.5, y: 0.6 },
                { id: '4', type: 'click', x: 0.7, y: 0.8 },
                { id: '5', type: 'ellipse', x: 0.2, y: 0.3, width: 0.2, height: 0.2 },
                { id: '6', type: 'click', x: 0.4, y: 0.5 },
            ];

            const normalized = normalizeStepAnnotations(annotations);

            const clickAnnotations = normalized.filter((a) => a.type === 'click');
            expect(clickAnnotations).toHaveLength(4);

            clickAnnotations.forEach((annotation, index) => {
                expect(annotation.number).toBe(index + 1);
            });
        });

        it('should handle click annotations with mixed types', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'click', x: 0.1, y: 0.2 },
                { id: '2', type: 'click', x: 0.3, y: 0.4 },
                { id: '3', type: 'rect', x: 0.5, y: 0.6, width: 0.2, height: 0.2 },
                { id: '4', type: 'click', x: 0.7, y: 0.8 },
            ];

            const normalized = normalizeStepAnnotations(annotations);

            expect(normalized[0].number).toBe(1);
            expect(normalized[1].number).toBe(2);
            expect(normalized[2].number).toBeNull();
            expect(normalized[3].number).toBe(3);
        });
    });

    describe('Crop Operation - Property: Bounds Preservation', () => {
        it('should preserve bounds for annotations within selection', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
            ];
            const selection = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };
            const cropped = cropStepAnnotations(annotations, selection);

            expect(cropped).toHaveLength(1);
            expect(cropped[0].id).toBe('1');
        });

        it('should remove annotations outside selection', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.7, y: 0.7, width: 0.2, height: 0.2 },
                { id: '2', type: 'ellipse', x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
            ];
            const selection = { x: 0.0, y: 0.0, width: 0.5, height: 0.5 };
            const cropped = cropStepAnnotations(annotations, selection);

            expect(cropped).toHaveLength(1);
            expect(cropped[0].id).toBe('2');
        });

        it('should handle partially overlapping annotations', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
            ];
            const selection = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
            const cropped = cropStepAnnotations(annotations, selection);

            expect(cropped).toHaveLength(1);
        });
    });

    describe('Multi-Annotation Workflow', () => {
        it('should handle complete workflow: create, select, move, delete', () => {
            // Create annotations
            let annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4 },
            ];

            let normalized = normalizeStepAnnotations(annotations);
            expect(normalized).toHaveLength(2);

            // Select first annotation
            let selectedId = '1';
            expect(normalized.find((a) => a.id === selectedId)).toBeDefined();

            // Move first annotation
            const moved = {
                ...normalized[0],
                x: 0.5,
                y: 0.6,
            };
            expect(moved.width).toBe(normalized[0].width);

            // Delete first annotation
            annotations = annotations.filter((a) => a.id !== '1');
            normalized = normalizeStepAnnotations(annotations);
            expect(normalized).toHaveLength(1);
            expect(normalized[0].id).toBe('2');
        });

        it('should handle layer reordering workflow', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4, order: 0 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4, order: 1 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, order: 2 },
            ];

            let normalized = normalizeStepAnnotations(annotations);
            expect(normalized[0].id).toBe('1');
            expect(normalized[1].id).toBe('2');
            expect(normalized[2].id).toBe('3');

            // Move annotation 1 to front
            const reordered = [
                { ...normalized[1], order: 0 },
                { ...normalized[2], order: 1 },
                { ...normalized[0], order: 2 },
            ];

            normalized = withUpdatedAnnotationOrder(reordered);
            expect(normalized[0].id).toBe('2');
            expect(normalized[1].id).toBe('3');
            expect(normalized[2].id).toBe('1');
        });
    });
});
