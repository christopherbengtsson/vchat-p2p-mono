import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { MockInstance } from 'vitest';
import { GlassElement } from '../GlassElement';
import * as getDisplacementFilterModule from '../getDisplacementFilter';

describe('GlassElement', () => {
  let getDisplacementFilterSpy: MockInstance;

  beforeEach(() => {
    // Mock Chrome browser support for SVG filters
    Object.defineProperty(window, 'chrome', {
      writable: true,
      configurable: true,
      value: {},
    });

    getDisplacementFilterSpy = vi
      .spyOn(getDisplacementFilterModule, 'getDisplacementFilter')
      .mockReturnValue('data:image/svg+xml;utf8,mocked-filter');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default props', () => {
    render(
      <GlassElement maxHeight={100} maxWidth={200}>
        <div>Test Content</div>
      </GlassElement>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply correct styles with provided dimensions', () => {
    const { container } = render(
      <GlassElement maxHeight={300} maxWidth={400} radius={12}>
        <div>Content</div>
      </GlassElement>,
    );

    const glassDiv = container.querySelector('.liquid-glass');
    expect(glassDiv).toHaveStyle({
      maxHeight: '300px',
      maxWidth: '400px',
      borderRadius: '12px',
    });
  });

  it('should call getDisplacementFilter with correct parameters', () => {
    render(
      <GlassElement
        maxHeight={100}
        maxWidth={200}
        radius={10}
        depth={15}
        strength={60}
        chromaticAberration={8}
      >
        <div>Content</div>
      </GlassElement>,
    );

    expect(getDisplacementFilterSpy).toHaveBeenCalledWith({
      maxHeight: 100,
      maxWidth: 200,
      radius: 10,
      depth: 15,
      strength: 60,
      chromaticAberration: 8,
    });
  });

  it('should memoize filter generation when props do not change', () => {
    const { rerender } = render(
      <GlassElement maxHeight={100} maxWidth={200}>
        <div>Content 1</div>
      </GlassElement>,
    );

    // First render calls the filter function
    expect(getDisplacementFilterSpy).toHaveBeenCalledTimes(1);

    // Re-render with same props but different children
    rerender(
      <GlassElement maxHeight={100} maxWidth={200}>
        <div>Content 2</div>
      </GlassElement>,
    );

    // Should still only be called once due to memoization
    expect(getDisplacementFilterSpy).toHaveBeenCalledTimes(1);
  });

  it('should recalculate filter when relevant props change', () => {
    const { rerender } = render(
      <GlassElement maxHeight={100} maxWidth={200}>
        <div>Content</div>
      </GlassElement>,
    );

    expect(getDisplacementFilterSpy).toHaveBeenCalledTimes(1);

    // Re-render with different dimensions
    rerender(
      <GlassElement maxHeight={150} maxWidth={250}>
        <div>Content</div>
      </GlassElement>,
    );

    // Should be called again with new dimensions
    expect(getDisplacementFilterSpy).toHaveBeenCalledTimes(2);
    expect(getDisplacementFilterSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        maxHeight: 150,
        maxWidth: 250,
      }),
    );
  });

  it('should add cursor-pointer class when ripple is enabled', () => {
    const { container } = render(
      <GlassElement maxHeight={100} maxWidth={200} ripple>
        <div>Content</div>
      </GlassElement>,
    );

    const glassDiv = container.querySelector('.liquid-glass');
    expect(glassDiv).toHaveClass('cursor-pointer');
  });

  it('should not add cursor-pointer class when ripple is disabled', () => {
    const { container } = render(
      <GlassElement maxHeight={100} maxWidth={200} ripple={false}>
        <div>Content</div>
      </GlassElement>,
    );

    const glassDiv = container.querySelector('.liquid-glass');
    expect(glassDiv).not.toHaveClass('cursor-pointer');
  });

  it('should trigger ripple effect on mouse down and up when ripple is enabled', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <GlassElement maxHeight={100} maxWidth={200} ripple depth={10}>
        <div>Content</div>
      </GlassElement>,
    );

    const glassDiv = container.querySelector('.liquid-glass') as HTMLElement;

    // Initial render with base depth
    expect(getDisplacementFilterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        depth: 10,
      }),
    );

    // Mouse down should trigger depth change
    await user.pointer({ keys: '[MouseLeft>]', target: glassDiv });

    // Should recalculate with reduced depth (10 / 0.7 ≈ 14.29)
    expect(getDisplacementFilterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        depth: expect.closeTo(14.29, 0.01),
      }),
    );

    // Mouse up should restore original depth
    await user.pointer({ keys: '[/MouseLeft]', target: glassDiv });

    expect(getDisplacementFilterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        depth: 10,
      }),
    );
  });

  it('should not trigger ripple effect when ripple is disabled', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <GlassElement maxHeight={100} maxWidth={200} ripple={false} depth={10}>
        <div>Content</div>
      </GlassElement>,
    );

    const glassDiv = container.querySelector('.liquid-glass') as HTMLElement;

    // Initial render
    const initialCallCount = getDisplacementFilterSpy.mock.calls.length;

    // Mouse down and up should not trigger re-render
    await user.pointer({ keys: '[MouseLeft>]', target: glassDiv });
    await user.pointer({ keys: '[/MouseLeft]', target: glassDiv });

    // Should not have additional calls
    expect(getDisplacementFilterSpy).toHaveBeenCalledTimes(initialCallCount);
  });

  it('should apply backdrop-filter style', () => {
    const { container } = render(
      <GlassElement maxHeight={100} maxWidth={200}>
        <div>Content</div>
      </GlassElement>,
    );

    const glassDiv = container.querySelector('.liquid-glass') as HTMLElement;
    const backdropFilter = glassDiv.style.backdropFilter;

    // Should have some backdrop-filter applied (either SVG or fallback)
    expect(backdropFilter).toBeTruthy();
    expect(backdropFilter.length).toBeGreaterThan(0);
  });
});
