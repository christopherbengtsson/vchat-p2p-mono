import { observer } from 'mobx-react';
import { Settings, LogOut, UserPen, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRootStore } from '@/stores/context/RootStoreContext';
import { useLogout } from '../hooks/useLogout';

interface Props {
  handleProfileOpen: VoidFunction;
}

export const SettingsMenu = observer(function SettingsMenu({
  handleProfileOpen,
}: Props) {
  const { authStore } = useRootStore();
  const { mutate } = useLogout();
  const isAnonymous = authStore.session?.user.is_anonymous;

  const handleLogout = async () => {
    mutate();
  };

  return (
    <div className="absolute top-0 right-0 p-inherit">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 mx-4">
          <DropdownMenuLabel>Settings</DropdownMenuLabel>

          <DropdownMenuItem disabled={!isAnonymous} onClick={handleProfileOpen}>
            {isAnonymous ? <UserPlus /> : <UserPen />}
            <span>
              {authStore.session?.user.is_anonymous
                ? 'Save account'
                : 'Profile'}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
