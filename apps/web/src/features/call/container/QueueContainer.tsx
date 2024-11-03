import { observer } from 'mobx-react';
import { useNavigate } from 'react-router-dom';
import { MdTravelExplore } from 'react-icons/md';
import { Button } from '@/common/components/ui/button';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { AppState } from '@/stores/model/AppState';
import { UserAvatar } from '../component/UserAvatar';
import { MatchedUserText } from '../component/MatchedUserText';

export const QueueContainer = observer(function QueuePage() {
  const { uiStore, callStore } = useRootStore();
  const navigate = useNavigate();

  const handleCancel = () => {
    uiStore.cancelMatch();
    navigate(-1);
  };

  if (uiStore.appState === AppState.IN_QUEUE) {
    return (
      <div className="flex flex-col justify-center items-center gap-16 ">
        <MdTravelExplore className="text-white rounded-full text-[10em] animate-loading-pulse" />

        <Button variant="link" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    );
  }

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

      <MatchedUserText partnerId={callStore.partnerId} />
    </div>
  );
});
