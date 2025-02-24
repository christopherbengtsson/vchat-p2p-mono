import { observer } from 'mobx-react';
import { UserAvatar } from '../component/UserAvatar';
import { MatchedUserText } from '../component/MatchedUserText';

interface Props {
  partnerSocketId: string;
}

export const NewMatchContainer = observer(function NewMatchContainer({
  partnerSocketId,
}: Props) {
  return (
    <div className="flex flex-col justify-center items-center gap-6">
      <div className="flex gap-4">
        <UserAvatar
          src="https://github.com/shadcn.png"
          alt="you"
          fallback="CB"
        />
        <UserAvatar
          src="https://github.com/shadcn.png"
          alt="partner"
          fallback="RN"
        />
      </div>

      <MatchedUserText partnerId={partnerSocketId} />
    </div>
  );
});
