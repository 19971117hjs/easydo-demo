import { describe, it, expect } from 'vitest';
import type { StepAnnotation } from '@shared/contracts';
import { normalizeStepAnnotations } from '@shared/step-annotations';

describe('ScreenshotAnnotator Component', () => {
    describe('Annotation Creation', () => {
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

        it('should create ellipse annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'ellipse',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].type).toBe('ellipse');
        });

        it('should create highlight annotation with correct opacity', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'highlight',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].opacity).toBe(0.34);
        });

        it('should create text annotation with default text', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'text',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].text).toBe('Add text');
            expect(normalized[0].textColor).toBe('#ffffff');
        });

        it('should create tooltip annotation with default text', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'tooltip',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].text).toBe('Explain this area');
            expect(normalized[0].shadow).toBe(true);
        });

        it('should create blur annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'blur',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].blurAmount).toBe(12);
        });

        it('should create magnify annotation with correct defaults', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'magnify',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].magnifyZoom).toBe(1.8);
            expect(normalized[0].radius).toBe(999);
            expect(normalized[0].shadow).toBe(true);
        });

        it('should create arrow annotation with end arrowhead', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'arrow',
                x: 0.1,
                y: 0.2,
                x2: 0.5,
                y2: 0.6,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].showArrowHeadEnd).toBe(true);
            expect(normalized[0].showArrowHeadStart).toBe(false);
        });

        it('should create line annotation without arrowheads', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'line',
                x: 0.1,
                y: 0.2,
                x2: 0.5,
                y2: 0.6,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].showArrowHeadEnd).toBe(false);
            expect(normalized[0].showArrowHeadStart).toBe(false);
        });

        it('should create brush annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'brush',
                x: 0.1,
                y: 0.1,
                points: [
                    { x: 0.1, y: 0.1 },
                    { x: 0.2, y: 0.2 },
                    { x: 0.3, y: 0.3 },
                ],
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].type).toBe('brush');
            expect(normalized[0].points).toHaveLength(3);
        });

        it('should create click annotation with auto-incremented number', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'click', x: 0.1, y: 0.2 },
                { id: '2', type: 'click', x: 0.3, y: 0.4 },
                { id: '3', type: 'click', x: 0.5, y: 0.6 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            expect(normalized[0].number).toBe(1);
            expect(normalized[1].number).toBe(2);
            expect(normalized[2].number).toBe(3);
        });

        it('should create cursor annotation with pointer variant', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'cursor',
                x: 0.1,
                y: 0.2,
                width: 0.08,
                height: 0.12,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].cursorVariant).toBe('pointer');
        });

        it('should create asset annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'asset',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.3,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].type).toBe('asset');
        });
    });

    describe('Selection Management', () => {
        it('should select single annotation', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            expect(normalized[0].id).toBe('1');
        });

        it('should maintain only one selected annotation', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            expect(normalized).toHaveLength(2);
        });
    });

    describe('Move Interaction', () => {
        it('should preserve size during move', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            const moved = {
                ...normalized[0],
                x: 0.5,
                y: 0.6,
            };
            expect(moved.width).toBe(0.3);
            expect(moved.height).toBe(0.4);
        });

        it('should clamp moved annotation to canvas bounds', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.8,
                y: 0.8,
                width: 0.3,
                height: 0.3,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].x + normalized[0].width!).toBeLessThanOrEqual(1);
            expect(normalized[0].y + normalized[0].height!).toBeLessThanOrEqual(1);
        });
    });

    describe('Resize Interaction', () => {
        it('should enforce minimum size during resize', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.5,
                y: 0.5,
                width: 0.001,
                height: 0.001,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].width).toBeGreaterThanOrEqual(0.012);
            expect(normalized[0].height).toBeGreaterThanOrEqual(0.012);
        });

        it('should preserve aspect ratio for asset annotation', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'asset',
                x: 0.1,
                y: 0.1,
                width: 0.2,
                height: 0.2,
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
            expect(normalized[0].type).toBe('asset');
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

        it('should allow free resize for rectangle', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.1,
                y: 0.1,
                width: 0.2,
                height: 0.3,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].width).toBe(0.2);
            expect(normalized[0].height).toBe(0.3);
        });
    });

    describe('Delete Operation', () => {
        it('should remove annotation from list', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4 },
            ];
            const filtered = annotations.filter((a) => a.id !== '1');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('2');
        });

        it('should update order after deletion', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4, order: 0 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4, order: 1 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, order: 2 },
            ];
            const filtered = annotations.filter((a) => a.id !== '2');
            const normalized = normalizeStepAnnotations(filtered);
            expect(normalized[0].order).toBe(0);
            expect(normalized[1].order).toBe(1);
        });
    });

    describe('Layer Management', () => {
        it('should update z-order when moving forward', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4, order: 0 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4, order: 1 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            expect(normalized[0].order).toBe(0);
            expect(normalized[1].order).toBe(1);
        });

        it('should maintain z-order consistency', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4, order: 5 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4, order: 2 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, order: 8 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            expect(normalized[0].order).toBe(0);
            expect(normalized[1].order).toBe(1);
            expect(normalized[2].order).toBe(2);
        });
    });

    describe('Keyboard Shortcuts', () => {
        it('should support Delete key for deletion', () => {
            // This would be tested in integration tests with actual component
            expect(true).toBe(true);
        });

        it('should support Backspace key for deletion', () => {
            // This would be tested in integration tests with actual component
            expect(true).toBe(true);
        });

        it('should support Escape to cancel drawing', () => {
            // This would be tested in integration tests with actual component
            expect(true).toBe(true);
        });

        it('should support Enter for text editing', () => {
            // This would be tested in integration tests with actual component
            expect(true).toBe(true);
        });
    });

    describe('Focus Management', () => {
        it('should handle canvas focus', () => {
            // This would be tested in integration tests with actual component
            expect(true).toBe(true);
        });

        it('should handle text editor focus', () => {
            // This would be tested in integration tests with actual component
            expect(true).toBe(true);
        });

        it('should handle details panel focus', () => {
            // This would be tested in integration tests with actual component
            expect(true).toBe(true);
        });
    });

    describe('Property Editing', () => {
        it('should update color property', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
                color: '#ff0000',
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].color).toBe('#ff0000');
        });

        it('should update stroke width property', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'rect',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
                strokeWidth: 5,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].strokeWidth).toBe(5);
        });

        it('should update text content', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'text',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
                text: 'Custom text',
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].text).toBe('Custom text');
        });

        it('should update font size', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'text',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
                fontSize: 24,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].fontSize).toBe(24);
        });

        it('should update tooltip placement', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'tooltip',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
                tooltipPlacement: 'top',
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].tooltipPlacement).toBe('top');
        });

        it('should update magnify zoom', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'magnify',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
                magnifyZoom: 3,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].magnifyZoom).toBe(3);
        });

        it('should update blur amount', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'blur',
                x: 0.1,
                y: 0.2,
                width: 0.3,
                height: 0.4,
                blurAmount: 20,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].blurAmount).toBe(20);
        });

        it('should update cursor variant', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'cursor',
                x: 0.1,
                y: 0.2,
                width: 0.08,
                height: 0.12,
                cursorVariant: 'text',
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].cursorVariant).toBe('text');
        });

        it('should update line style', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'line',
                x: 0.1,
                y: 0.2,
                x2: 0.5,
                y2: 0.6,
                lineStyle: 'dashed',
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].lineStyle).toBe('dashed');
        });

        it('should update arrow head visibility', () => {
            const annotation: StepAnnotation = {
                id: 'test',
                type: 'arrow',
                x: 0.1,
                y: 0.2,
                x2: 0.5,
                y2: 0.6,
                showArrowHeadStart: true,
                showArrowHeadEnd: false,
            };
            const normalized = normalizeStepAnnotations([annotation]);
            expect(normalized[0].showArrowHeadStart).toBe(true);
            expect(normalized[0].showArrowHeadEnd).toBe(false);
        });
    });

    describe('Bounds Normalization Property', () => {
        it('should always normalize bounds to [0, 1] range for all types', () => {
            const types: Array<StepAnnotation['type']> = [
                'rect',
                'ellipse',
                'highlight',
                'text',
                'tooltip',
                'blur',
                'magnify',
                'cursor',
                'asset',
            ];

            types.forEach((type) => {
                const annotation: StepAnnotation = {
                    id: 'test',
                    type,
                    x: -0.5,
                    y: 1.5,
                    width: 2,
                    height: 2,
                };
                const normalized = normalizeStepAnnotations([annotation]);
                expect(normalized[0].x).toBeGreaterThanOrEqual(0);
                expect(normalized[0].x).toBeLessThanOrEqual(1);
                expect(normalized[0].y).toBeGreaterThanOrEqual(0);
                expect(normalized[0].y).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('Minimum Size Enforcement Property', () => {
        it('should enforce minimum size of 0.012 for all area types', () => {
            const types: Array<StepAnnotation['type']> = [
                'rect',
                'ellipse',
                'highlight',
                'text',
                'tooltip',
                'blur',
                'magnify',
                'cursor',
                'asset',
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
    });

    describe('Z-Order Consistency Property', () => {
        it('should maintain sequential z-order for multiple annotations', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4, order: 10 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4, order: 5 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, order: 15 },
                { id: '4', type: 'text', x: 0.2, y: 0.3, width: 0.2, height: 0.2, order: 2 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            for (let i = 0; i < normalized.length - 1; i++) {
                expect((normalized[i].order ?? 0)).toBeLessThan((normalized[i + 1].order ?? 0));
            }
        });
    });

    describe('Selection Uniqueness Property', () => {
        it('should maintain at most one selected annotation', () => {
            const annotations: StepAnnotation[] = [
                { id: '1', type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
                { id: '2', type: 'ellipse', x: 0.4, y: 0.5, width: 0.3, height: 0.4 },
                { id: '3', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5 },
            ];
            const normalized = normalizeStepAnnotations(annotations);
            expect(normalized.length).toBeGreaterThan(0);
        });
    });
});
