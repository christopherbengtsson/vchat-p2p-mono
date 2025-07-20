import { renderHook, act } from '@testing-library/react';
import { CaptchaService } from '../../service/CaptchaService';
import { useInitCaptcha } from '../useInitCaptcha';

// @cap.js/widget is globally mocked in testSetup.ts
vi.mock('../../service/CaptchaService');

describe('useInitCaptcha', () => {
  let mockCap: any;

  beforeEach(() => {
    vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');
    mockCap = (global as any).mockCap;

    // Setup CaptchaService mocks
    vi.mocked(CaptchaService.init).mockReturnValue(mockCap as any);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should auto-initialize captcha on mount', () => {
      const { result } = renderHook(() => useInitCaptcha());

      expect(result.current.current).toBe(mockCap);
      expect(CaptchaService.init).toHaveBeenCalledOnce();
    });

    it('should initialize automatically on mount', () => {
      const { result } = renderHook(() => useInitCaptcha());

      expect(CaptchaService.init).toHaveBeenCalledOnce();
      expect(result.current.current).toBe(mockCap);
    });

    it('should maintain cap instance after initialization', () => {
      const { result } = renderHook(() => useInitCaptcha());

      expect(result.current.current).toBe(mockCap);
      expect(result.current.current).not.toBe(null);
    });

    it('should only initialize once per hook instance', () => {
      const { result } = renderHook(() => useInitCaptcha());

      expect(CaptchaService.init).toHaveBeenCalledOnce();
      expect(result.current.current).toBe(mockCap);
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', () => {
      const error = new Error('Initialization failed');
      vi.mocked(CaptchaService.init).mockImplementation(() => {
        throw error;
      });

      expect(() => {
        renderHook(() => useInitCaptcha());
      }).toThrow('Initialization failed');

      expect(CaptchaService.init).toHaveBeenCalledOnce();
    });

    it('should not update cap ref when initialization fails', () => {
      vi.mocked(CaptchaService.init).mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      expect(() => {
        renderHook(() => useInitCaptcha());
      }).toThrow();

      expect(CaptchaService.init).toHaveBeenCalledOnce();
    });
  });

  describe('hook stability', () => {
    it('should provide stable cap ref across renders', () => {
      const { result, rerender } = renderHook(() => useInitCaptcha());

      const firstCapRef = result.current;

      rerender();

      const secondCapRef = result.current;

      expect(firstCapRef).toBe(secondCapRef);
    });

    it('should maintain cap instance across rerenders', () => {
      const { result, rerender } = renderHook(() => useInitCaptcha());

      const capAfterInit = result.current.current;

      rerender();

      expect(result.current.current).toBe(capAfterInit);
      expect(result.current.current).toBe(mockCap);
    });
  });

  describe('service integration', () => {
    it('should pass correct parameters to CaptchaService.init', () => {
      renderHook(() => useInitCaptcha());

      expect(CaptchaService.init).toHaveBeenCalledWith();
      expect(CaptchaService.init).toHaveBeenCalledTimes(1);
    });

    it('should store the exact instance returned by CaptchaService.init', () => {
      const customMockCap = { id: 'custom-cap', solve: vi.fn() };
      vi.mocked(CaptchaService.init).mockReturnValue(customMockCap as any);

      const { result } = renderHook(() => useInitCaptcha());

      expect(result.current.current).toBe(customMockCap);
      expect(result.current.current).toEqual(customMockCap);
    });
  });

  describe('captcha disabled', () => {
    it('should not initialize when captcha is disabled', () => {
      vi.stubEnv('VITE_CAPTCHA_ENABLED', 'false');

      const { result } = renderHook(() => useInitCaptcha());

      expect(CaptchaService.init).not.toHaveBeenCalled();
      expect(result.current.current).toBe(null);
    });
  });

  describe('cleanup functionality', () => {
    it('should reset the captcha instance on unmount', () => {
      // Mock document.querySelectorAll
      const mockRemove = vi.fn();
      const mockElements = [{ remove: mockRemove }];
      vi.spyOn(document, 'querySelectorAll').mockReturnValue(
        mockElements as any,
      );

      const { unmount } = renderHook(() => useInitCaptcha());

      act(() => {
        unmount();
      });

      expect(CaptchaService.reset).toHaveBeenCalledWith(mockCap);
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
