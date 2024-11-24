import { SettingsMenuContainer } from '../container/SettingsMenuContainer';
import { ConnectionCountContainer } from '../container/ConnectionCountContainer';
import { FindMatchContainer } from '../container/FindMatchContainer';

export function HomePage() {
  return (
    <>
      <SettingsMenuContainer />

      <div className="w-full max-w-sm flex flex-col items-center gap-4 p-4">
        <FindMatchContainer />
        <ConnectionCountContainer />
      </div>
    </>
  );
}
