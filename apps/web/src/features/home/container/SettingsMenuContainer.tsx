import { useCallback, useState } from 'react';
import { observer } from 'mobx-react';
import { Settings } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ProfileMenuItem } from '../component/ProfileMenuItem';
import { LogoutMenuItem } from '../component/LogoutMenuItem';
import { useLogout } from '../hooks/useLogout';
import { ProfileDialogContainer } from './ProfileDialogContainer';

export const SettingsMenuContainer = observer(function SettingsMenuContainer() {
  const { authStore } = useRootStore();
  const logoutMutation = useLogout();

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const handleLogout = async () => {
    logoutMutation.mutate();
  };

  const profileDialogToggle = useCallback(() => {
    setProfileDialogOpen(!profileDialogOpen);
  }, [profileDialogOpen]);

  return (
    <>
      <div className="absolute top-0 right-0 p-inherit">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mx-4">
            <DropdownMenuLabel>Settings</DropdownMenuLabel>

            <ProfileMenuItem
              profileDialogToggle={profileDialogToggle}
              isAnonymous={Boolean(authStore.session?.user.is_anonymous)}
            />

            <LogoutMenuItem handleLogout={handleLogout} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfileDialogContainer
        open={profileDialogOpen}
        handleProfileOpen={profileDialogToggle}
      />
    </>
  );
});
