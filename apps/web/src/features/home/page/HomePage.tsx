import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Button } from '@/common/components/ui/button';
import { LoadingButton } from '@/common/components/loading-button/LoadingButton';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { SettingsMenu } from '../component/SettingsMenu';
import { ProfileDialogContainer } from '../container/ProfileDialogContainer';

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
              <LoadingButton /> Connecting...
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

        <ProfileDialogContainer
          open={profileDialogOpen}
          handleProfileOpen={handleProfileOpen}
        />
      </div>
    </>
  );
});
