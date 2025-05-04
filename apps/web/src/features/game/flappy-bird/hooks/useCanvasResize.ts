import { useEffect, useState } from 'react';
import debounce from 'lodash.debounce';
import { BREAKPOINTS, DEVICE_SCALING } from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';

export const useCanvasResize = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
) => {
  const [scaleFactor, setScaleFactor] = useState<ScaleFactor>({
    widthScale: 1,
    heightScale: 1,
    devicePixelRatio: window.devicePixelRatio || 1,
    deviceType: 'LAPTOP', // Default device type
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateCanvasSize = () => {
      const { clientWidth: width, clientHeight: height } = container;
      const dpr = window.devicePixelRatio || 1;

      // Determine device type based on screen width
      let deviceType: 'MOBILE' | 'TABLET' | 'LAPTOP' | 'DESKTOP' = 'LAPTOP';

      if (width < BREAKPOINTS.SM) {
        deviceType = 'MOBILE';
      } else if (width < BREAKPOINTS.LG) {
        deviceType = 'TABLET';
      } else if (width < BREAKPOINTS.XXL) {
        deviceType = 'LAPTOP';
      } else {
        deviceType = 'DESKTOP';
      }

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Calculate base scaling factors
      const baseWidthScale = width / BREAKPOINTS.MD;
      const baseHeightScale = height / (BREAKPOINTS.MD * 0.75);

      // Apply device-specific scaling
      const deviceScaleFactor = DEVICE_SCALING[deviceType];

      setScaleFactor({
        widthScale: baseWidthScale,
        heightScale: baseHeightScale,
        devicePixelRatio: dpr,
        deviceType,
        deviceScaleFactor,
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);
      }
    };

    // Initial sizing - no debounce
    updateCanvasSize();

    // Debounced resize for subsequent resizing
    const handleResize = debounce(updateCanvasSize, 100);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    window.addEventListener('orientationchange', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', handleResize);
      handleResize.cancel();
    };
  }, [canvasRef, containerRef]);

  return scaleFactor;
};
