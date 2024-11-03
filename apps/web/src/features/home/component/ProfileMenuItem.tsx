import { observer } from 'mobx-react';
import { UserPen, UserPlus } from 'lucide-react';
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu';

interface Props {
  profileDialogToggle: VoidFunction;
  isAnonymous: boolean;
}

export const ProfileMenuItem = observer(function ProfileMenuItem({
  profileDialogToggle,
  isAnonymous,
}: Props) {
  return (
    <DropdownMenuItem disabled={!isAnonymous} onClick={profileDialogToggle}>
      {isAnonymous ? <UserPlus /> : <UserPen />}
      <span>{isAnonymous ? 'Save account' : 'Profile'}</span>
    </DropdownMenuItem>
  );
});
