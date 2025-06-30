import '@testing-library/jest-dom/vitest';

vi.mock(
  './features/call/in-call/content-moderation/service/NSFWModelService',
  () => ({
    NSFWModelService: {
      load: vi.fn(),
      get: vi.fn(),
      reset: vi.fn(),
    },
  }),
);

// Mocks ResizeObserver to allow testing containers and hooks using ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/** UI lib JSDom issues */
window.HTMLElement.prototype.setPointerCapture = vi.fn();

const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (element: Element, pseudoElt?: string | null) => {
  const computedStyle = originalGetComputedStyle(element, pseudoElt);

  // Create a proxy to intercept property access
  return new Proxy(computedStyle, {
    get: (target, prop) => {
      // Intercept transform-related properties
      if (
        prop === 'transform' ||
        prop === 'webkitTransform' ||
        prop === 'mozTransform'
      ) {
        // Return a valid matrix3d transform string that can be parsed
        return 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)';
      }

      return target[prop as keyof CSSStyleDeclaration];
    },
  });
};
