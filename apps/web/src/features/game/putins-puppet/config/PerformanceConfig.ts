interface PerformanceProfile {
  fftSize: number;
  canvasStreamFPS: number;
  audioPitchThrottle: number;
}

const detectDeviceCapability = (): 'low' | 'medium' | 'high' => {
  const cores = navigator.hardwareConcurrency || 2;
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;

  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'medium';
  return 'high';
};

export const PERFORMANCE_PROFILES: Record<string, PerformanceProfile> = {
  low: {
    fftSize: 1024, // Reduce FFT from 2048
    canvasStreamFPS: 10, // Reduce from 15 FPS
    audioPitchThrottle: 50, // 20 FPS instead of 30 FPS
  },
  medium: {
    fftSize: 1536,
    canvasStreamFPS: 12,
    audioPitchThrottle: 40,
  },
  high: {
    fftSize: 2048,
    canvasStreamFPS: 15,
    audioPitchThrottle: 33,
  },
};

export const DEVICE_PROFILE = PERFORMANCE_PROFILES[detectDeviceCapability()];
