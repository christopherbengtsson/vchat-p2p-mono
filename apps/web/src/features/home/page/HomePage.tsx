import { ShieldCheck, HatGlasses } from 'lucide-react';
import { useCursorTrack } from '@/common/hooks/useCursorTrack';
import { ConnectionCountContainer } from '../container/ConnectionCountContainer';
import { FindMatchContainer } from '../container/FindMatchContainer';
import { SettingsMenuContainer } from '../container/SettingsMenuContainer';
import { Badge } from '../../../common/components/ui/badge';

export function HomePage() {
  useCursorTrack();

  return (
    <>
      <SettingsMenuContainer />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-sm flex flex-col items-center p-4 pointer-events-auto">
          <FindMatchContainer />
        </div>
      </div>

      <footer className="fixed bottom-0 m-4 w-full flex justify-center">
        <div className="flex gap-2">
          <ConnectionCountContainer />

          <Badge variant="outline" className="mt-8 text-white">
            <ShieldCheck className="text-chart-1" />
            Moderated
          </Badge>

          <Badge variant="outline" className="mt-8 text-white">
            <HatGlasses />
            Anonymous
          </Badge>
        </div>
      </footer>
    </>
  );
}
