import { renderHook } from '@testing-library/react';
import { useToggleRemoteVideoElement } from '../useToggleRemoteVideoElement';

describe('useToggleRemoteVideoElement', () => {
  let mockVideoElement: HTMLVideoElement;

  beforeEach(() => {
    mockVideoElement = document.createElement('video');
    mockVideoElement.setAttribute('data-testid', 'remote-video-element');
    mockVideoElement.style.display = 'block'; // Default state
    document.body.appendChild(mockVideoElement);
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Video element hiding/showing behavior', () => {
    it('should hide video element on mount', () => {
      expect(mockVideoElement.style.display).toBe('block'); // Initial state

      renderHook(() => useToggleRemoteVideoElement());

      expect(mockVideoElement.style.display).toBe('none');
    });

    it('should show video element on unmount', () => {
      const { unmount } = renderHook(() => useToggleRemoteVideoElement());

      expect(mockVideoElement.style.display).toBe('none');

      unmount();

      expect(mockVideoElement.style.display).toBe('block');
    });

    it('should maintain display state between renders', () => {
      const { rerender } = renderHook(() => useToggleRemoteVideoElement());

      expect(mockVideoElement.style.display).toBe('none');

      // Re-render should not change the display state
      rerender();

      expect(mockVideoElement.style.display).toBe('none');
    });

    it('should handle video element with different initial display states', () => {
      // Set initial display to 'flex'
      mockVideoElement.style.display = 'flex';

      renderHook(() => useToggleRemoteVideoElement());

      expect(mockVideoElement.style.display).toBe('none');
    });

    it('should handle video element with inline styles', () => {
      // Set some inline styles
      mockVideoElement.style.cssText =
        'width: 100px; height: 200px; display: block;';

      renderHook(() => useToggleRemoteVideoElement());

      expect(mockVideoElement.style.display).toBe('none');
      // Other styles should be preserved
      expect(mockVideoElement.style.width).toBe('100px');
      expect(mockVideoElement.style.height).toBe('200px');
    });
  });

  describe('Cleanup on unmount', () => {
    it('should restore video element visibility on cleanup', () => {
      const { unmount } = renderHook(() => useToggleRemoteVideoElement());

      // Video should be hidden initially
      expect(mockVideoElement.style.display).toBe('none');

      // Unmount should restore visibility
      unmount();

      expect(mockVideoElement.style.display).toBe('block');
    });

    it('should handle multiple mount/unmount cycles', () => {
      // First mount/unmount cycle
      const { unmount: unmount1 } = renderHook(() =>
        useToggleRemoteVideoElement(),
      );
      expect(mockVideoElement.style.display).toBe('none');

      unmount1();
      expect(mockVideoElement.style.display).toBe('block');

      // Second mount/unmount cycle
      const { unmount: unmount2 } = renderHook(() =>
        useToggleRemoteVideoElement(),
      );
      expect(mockVideoElement.style.display).toBe('none');

      unmount2();
      expect(mockVideoElement.style.display).toBe('block');
    });

    it('should not interfere with cleanup if element is removed from DOM', () => {
      const { unmount } = renderHook(() => useToggleRemoteVideoElement());

      expect(mockVideoElement.style.display).toBe('none');

      // Remove element from DOM before unmount
      document.body.removeChild(mockVideoElement);

      // Unmount should not throw error
      expect(() => unmount()).not.toThrow();
    });

    it('should handle cleanup when element ref is null', () => {
      // Remove element before hook renders
      document.body.removeChild(mockVideoElement);

      const { unmount } = renderHook(() => useToggleRemoteVideoElement());

      // Unmount should not throw error when element was never found
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Graceful handling when element not found', () => {
    it('should handle missing video element gracefully', () => {
      // Remove the video element
      document.body.removeChild(mockVideoElement);

      // Hook should not throw when element is not found
      expect(() => {
        renderHook(() => useToggleRemoteVideoElement());
      }).not.toThrow();
    });

    it('should handle DOM without target element', () => {
      // Start with empty DOM
      document.body.innerHTML = '';

      const { unmount } = renderHook(() => useToggleRemoteVideoElement());

      // Should not throw during render or cleanup
      expect(() => unmount()).not.toThrow();
    });

    it('should handle element with wrong test id', () => {
      // Change the test id to something else
      mockVideoElement.setAttribute('data-testid', 'different-element');

      const { unmount } = renderHook(() => useToggleRemoteVideoElement());

      // Original element should not be affected
      expect(mockVideoElement.style.display).toBe('block');

      // Should not throw during cleanup
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple elements with same test id', () => {
      // Create a second video element with same test id
      const secondVideoElement = document.createElement('video');
      secondVideoElement.setAttribute('data-testid', 'remote-video-element');
      secondVideoElement.style.display = 'block';
      document.body.appendChild(secondVideoElement);

      renderHook(() => useToggleRemoteVideoElement());

      // querySelector should find the first element
      expect(mockVideoElement.style.display).toBe('none');
      // Second element should remain unchanged
      expect(secondVideoElement.style.display).toBe('block');
    });

    it('should handle non-video elements with same test id', () => {
      // Add a div with the same test id before the video
      const divElement = document.createElement('div');
      divElement.setAttribute('data-testid', 'remote-video-element');
      document.body.insertBefore(divElement, mockVideoElement);

      renderHook(() => useToggleRemoteVideoElement());

      // Should find and manipulate the first element (div)
      expect(divElement.style.display).toBe('none');
      // Video element should remain unchanged
      expect(mockVideoElement.style.display).toBe('block');
    });

    it('should handle element that is removed after hook initialization', () => {
      const { unmount } = renderHook(() => useToggleRemoteVideoElement());

      expect(mockVideoElement.style.display).toBe('none');

      // Remove element after hook has initialized
      document.body.removeChild(mockVideoElement);

      // Cleanup should handle missing element gracefully
      expect(() => unmount()).not.toThrow();
    });

    it('should handle element that becomes null reference', () => {
      const { unmount } = renderHook(() => useToggleRemoteVideoElement());

      expect(mockVideoElement.style.display).toBe('none');

      // Simulate element being removed and garbage collected
      // by overwriting the element's style property to null
      Object.defineProperty(mockVideoElement, 'style', {
        get: () => null,
        configurable: true,
      });

      // Should not throw during cleanup
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle document without querySelector', () => {
      const originalQuerySelector = document.querySelector;

      // Mock querySelector to return null
      document.querySelector = vi.fn().mockReturnValue(null);

      const { unmount } = renderHook(() => useToggleRemoteVideoElement());

      // Should not throw
      expect(() => unmount()).not.toThrow();

      // Restore original querySelector
      document.querySelector = originalQuerySelector;
    });

    it('should handle element with undefined style property', () => {
      // Create element without style property
      const mockElement = document.createElement('video') as any;
      mockElement.setAttribute('data-testid', 'remote-video-element');
      delete mockElement.style;

      document.body.removeChild(mockVideoElement);
      document.body.appendChild(mockElement);

      // Should not throw when style is undefined
      expect(() => {
        renderHook(() => useToggleRemoteVideoElement());
      }).not.toThrow();
    });
  });
});
