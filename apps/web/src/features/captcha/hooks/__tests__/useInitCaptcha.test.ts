import { renderHook, act } from '@testing-library/react';
import { CaptchaService } from '../../service/CaptchaService';
import { useInitCaptcha } from '../useInitCapcha';

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
    it('should initialize with null cap ref', () => {
      const { result } = renderHook(() => useInitCaptcha());

      expect(result.current.cap.current).toBe(null);
      expect(typeof result.current.init).toBe('function');
    });

    it('should call CaptchaService.init when init is called', () => {
      const { result } = renderHook(() => useInitCaptcha());

      act(() => {
        result.current.init();
      });

      expect(CaptchaService.init).toHaveBeenCalledOnce();
      expect(result.current.cap.current).toBe(mockCap);
    });

    it('should maintain cap instance after init', () => {
      const { result } = renderHook(() => useInitCaptcha());

      act(() => {
        result.current.init();
      });

      expect(result.current.cap.current).toBe(mockCap);
      expect(result.current.cap.current).not.toBe(null);
    });

    it('should handle multiple init calls', () => {
      const { result } = renderHook(() => useInitCaptcha());

      act(() => {
        result.current.init();
        result.current.init();
      });

      expect(CaptchaService.init).toHaveBeenCalledTimes(2);
      expect(result.current.cap.current).toBe(mockCap);
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', () => {
      const error = new Error('Initialization failed');
      vi.mocked(CaptchaService.init).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useInitCaptcha());

      expect(() => {
        act(() => {
          result.current.init();
        });
      }).toThrow('Initialization failed');

      expect(CaptchaService.init).toHaveBeenCalledOnce();
    });

    it('should not update cap ref when initialization fails', () => {
      vi.mocked(CaptchaService.init).mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      const { result } = renderHook(() => useInitCaptcha());

      expect(() => {
        act(() => {
          result.current.init();
        });
      }).toThrow();

      expect(result.current.cap.current).toBe(null);
    });
  });

  describe('hook stability', () => {
    it('should provide stable init function reference', () => {
      const { result, rerender } = renderHook(() => useInitCaptcha());

      const firstInit = result.current.init;

      rerender();

      const secondInit = result.current.init;

      expect(firstInit).toBe(secondInit);
    });

    it('should provide stable cap ref across renders', () => {
      const { result, rerender } = renderHook(() => useInitCaptcha());

      const firstCapRef = result.current.cap;

      rerender();

      const secondCapRef = result.current.cap;

      expect(firstCapRef).toBe(secondCapRef);
    });

    it('should maintain cap instance across rerenders', () => {
      const { result, rerender } = renderHook(() => useInitCaptcha());

      act(() => {
        result.current.init();
      });

      const capAfterInit = result.current.cap.current;

      rerender();

      expect(result.current.cap.current).toBe(capAfterInit);
      expect(result.current.cap.current).toBe(mockCap);
    });
  });

  describe('service integration', () => {
    it('should pass correct parameters to CaptchaService.init', () => {
      const { result } = renderHook(() => useInitCaptcha());

      act(() => {
        result.current.init();
      });

      expect(CaptchaService.init).toHaveBeenCalledWith();
      expect(CaptchaService.init).toHaveBeenCalledTimes(1);
    });

    it('should store the exact instance returned by CaptchaService.init', () => {
      const customMockCap = { id: 'custom-cap', solve: vi.fn() };
      vi.mocked(CaptchaService.init).mockReturnValue(customMockCap as any);

      const { result } = renderHook(() => useInitCaptcha());

      act(() => {
        result.current.init();
      });

      expect(result.current.cap.current).toBe(customMockCap);
      expect(result.current.cap.current).toEqual(customMockCap);
    });
  });
});
