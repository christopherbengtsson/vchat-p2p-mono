import { observer } from 'mobx-react';

interface Props {
  nrOfAvailableUsers: number;
}

export const CurrentUsersOnline = observer(function CurrentUsersOnline({
  nrOfAvailableUsers,
}: Props) {
  return (
    <p className="text-primary-foreground">
      Currently {nrOfAvailableUsers} more users online
    </p>
  );
});
