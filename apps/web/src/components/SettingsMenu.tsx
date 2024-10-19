import { observer } from 'mobx-react';
import { Settings, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRootStore } from '../stores/RootStoreContext';

export const SettingsMenu = observer(function SettingsMenu() {
  const { authStore } = useRootStore();

  const handleLogout = async () => {
    await authStore.logout();
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

          <DropdownMenuItem disabled>
            <User />
            <span>Profile</span>
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
