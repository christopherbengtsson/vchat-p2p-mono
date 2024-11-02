import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ProfileDialog } from '../component/ProfileDialog';
import { SettingsMenu } from '../component/SettingsMenu';

export const HomePage = observer(function StartPage() {
  const { uiStore, socketStore } = useRootStore();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const connectOrFindMatch = useCallback(async () => {
    uiStore.findMatch();
  }, [uiStore]);

  const handleProfileOpen = useCallback(() => {
    setProfileDialogOpen(!profileDialogOpen);
  }, [profileDialogOpen]);

  return (
    <>
      <SettingsMenu handleProfileOpen={handleProfileOpen} />

      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <Button
          asChild={socketStore.connected ? true : undefined}
          className="w-full"
          onClick={connectOrFindMatch}
          disabled={uiStore.errorState !== undefined || !socketStore.connected}
        >
          {!socketStore.connected ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
            </>
          ) : (
            <Link to="/call">Find match</Link>
          )}
        </Button>

        {socketStore.connected && (
          <p className="text-primary-foreground">
            Currently {uiStore.nrOfAvailableUsers} more users online
          </p>
        )}

        <ProfileDialog
          open={profileDialogOpen}
          handleProfileOpen={handleProfileOpen}
        />
      </div>
    </>
  );
});
