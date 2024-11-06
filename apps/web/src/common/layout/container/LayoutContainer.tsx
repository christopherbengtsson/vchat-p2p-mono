import { Outlet } from 'react-router-dom';
import { FullScreenVideoContainer } from './FullScreenVideoContainer';
import { DialogsContainer } from './DialogsContainer';

export function LayoutContainer() {
  return (
    <div className="themes-wrapper relative w-full h-screen overflow-hidden">
      <FullScreenVideoContainer />

      <main className="relative z-10 bg-transparent w-full h-screen flex items-center justify-center p-4">
        <Outlet />

        <DialogsContainer />
      </main>
    </div>
  );
}
