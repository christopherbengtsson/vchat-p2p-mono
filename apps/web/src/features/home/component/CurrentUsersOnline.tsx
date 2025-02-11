import { observer } from 'mobx-react';
import { TypographyP } from '@/common/components/typography/Typography';

interface Props {
  nrOfAvailableUsers: number;
}

export const CurrentUsersOnline = observer(function CurrentUsersOnline({
  nrOfAvailableUsers,
}: Props) {
  return (
    <TypographyP className="text-center">
      Currently {nrOfAvailableUsers} more users online
    </TypographyP>
  );
});
