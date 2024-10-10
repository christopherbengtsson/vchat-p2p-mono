import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { observer } from 'mobx-react';
import clsx from 'clsx';
import { useMainStore } from '../stores/MainStoreContext';

const DYNAMIC_DARK_MODE = window.matchMedia(
  '(prefers-color-scheme:dark)',
).matches;

export const MainVideoPage = observer(function StartPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mainStore = useMainStore();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mainStore.mainMediaStream;
    }
  }, [mainStore.mainMediaStream]);

  return (
    <div
      className={clsx(
        'themes-wrapper relative w-full h-screen overflow-hidden',
        {
          dark: DYNAMIC_DARK_MODE,
        },
      )}
    >
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted={!mainStore.inCall}
      />
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-90" />

      <main className="relative z-10 bg-transparent w-full h-screen flex items-center justify-center px-4">
        <Outlet />
      </main>
    </div>
  );
});
