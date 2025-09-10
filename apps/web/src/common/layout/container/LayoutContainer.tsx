import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor, Preload } from '@react-three/drei';
import { Layout } from '../component/Layout';
import { StarSphere } from '../../components/sphere/Sphere';
import { RoutePath } from '../../../RoutePath';

const ROUTES_WITH_THREEJS: string[] = [
  RoutePath.AUTH,
  RoutePath.HOME,
  RoutePath.CALL,
];

export function LayoutContainer() {
  const { pathname } = useLocation();
  const [dpr, setDpr] = useState(1.5);
  const [isThreeJSReady, setIsThreeJSReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ROUTES_WITH_THREEJS.includes(pathname)) {
      setIsThreeJSReady(false);
    }
  }, [pathname]);

  const handleCanvasReady = () => {
    setIsThreeJSReady(true);
  };

  return (
    <Layout>
      {ROUTES_WITH_THREEJS.includes(pathname) && (
        <Canvas
          ref={canvasRef}
          className={`absolute inset-0 transition-opacity duration-800 ease-in-out ${
            isThreeJSReady ? 'opacity-100' : 'opacity-0'
          }`}
          dpr={dpr}
          camera={{ position: [0, 5, 5], fov: 110 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'low-power',
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: true,
          }}
          onCreated={handleCanvasReady}
        >
          <PerformanceMonitor
            onIncline={() => setDpr(2)}
            onDecline={() => setDpr(1)}
            onFallback={() => setDpr(0.5)}
          >
            <Preload all />
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              enableRotate={true}
              maxDistance={5}
              autoRotate={true}
              autoRotateSpeed={0.2}
            />
            <StarSphere />
          </PerformanceMonitor>
        </Canvas>
      )}

      <Outlet />
    </Layout>
  );
}
