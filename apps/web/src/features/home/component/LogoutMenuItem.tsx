import { LogOut } from 'lucide-react';
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu';

interface Props {
  handleLogout: VoidFunction;
}

export function LogoutMenuItem({ handleLogout }: Props) {
  return (
    <DropdownMenuItem onClick={handleLogout}>
      <LogOut />
      <span>Log out</span>
    </DropdownMenuItem>
  );
}
