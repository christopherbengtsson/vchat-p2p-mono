import { Outlet } from 'react-router-dom';
import { DialogsContainer } from './DialogsContainer';

export function LayoutContainer() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <main className="relative w-full h-screen flex items-center justify-center">
        <Outlet />

        <DialogsContainer />
      </main>
    </div>
  );
}
