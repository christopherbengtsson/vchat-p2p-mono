import { useCursorTrack } from '@/common/hooks/useCursorTrack';
import { SettingsMenuContainer } from '../container/SettingsMenuContainer';
import { ConnectionCountContainer } from '../container/ConnectionCountContainer';
import { FindMatchContainer } from '../container/FindMatchContainer';

export function HomePage() {
  useCursorTrack();

  return (
    <>
      <SettingsMenuContainer />

      <div className="w-full max-w-sm flex flex-col items-center p-4">
        <FindMatchContainer />
        <ConnectionCountContainer />
      </div>
    </>
  );
}
