import '@testing-library/jest-dom/vitest';

// Mocks ResizeObserver to allow testing containers and hooks using ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
