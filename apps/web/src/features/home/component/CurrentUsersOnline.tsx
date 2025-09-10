import { observer } from 'mobx-react';
import { Dot } from 'lucide-react';
import { Badge } from '@/common/components/ui/badge';

interface Props {
  nrOfAvailableUsers: number;
}

export const CurrentUsersOnline = observer(function CurrentUsersOnline({
  nrOfAvailableUsers,
}: Props) {
  return (
    <Badge variant="outline" className="mt-8 text-white">
      <Dot className="text-chart-2" strokeWidth={10} />
      {nrOfAvailableUsers} online
    </Badge>
  );
});
