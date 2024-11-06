import { SettingsMenuContainer } from '../container/SettingsMenuContainer';
import { ConnectionCountContainer } from '../container/ConnectionCountContainer';
import { MovingBallContainer } from '../../moving-ball/container/MovingBallContainer';
import { FindMatchContainer } from '../container/FindMatchContainer';

export function HomePage() {
  return (
    <>
      <SettingsMenuContainer />

      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <FindMatchContainer />
        <ConnectionCountContainer />

        <MovingBallContainer />
      </div>
    </>
  );
}
