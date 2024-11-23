import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useNavigate } from 'react-router-dom';
import { MdTravelExplore } from 'react-icons/md';
import { Assert } from '@/common/utils/Assert';
import { Button } from '@/common/components/ui/button';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { CallState } from '@/stores/model/CallState';
import { UserAvatar } from '../component/UserAvatar';
import { MatchedUserText } from '../component/MatchedUserText';

export const QueueContainer = observer(function QueuePage() {
  const { callStore, socketStore } = useRootStore();
  const navigate = useNavigate();

  useEffect(() => {
    socketStore.socket?.on('match-found', (...args) => {
      callStore.initNewCall(...args);
    });

    return () => {
      socketStore.socket?.off('match-found');
    };
  }, [callStore, socketStore.socket]);

  const handleCancel = () => {
    callStore.cancelMatch();
    navigate(-1);
  };

  if (callStore.callState === CallState.IN_QUEUE) {
    return (
      <div className="flex flex-col justify-center items-center gap-16 ">
        <MdTravelExplore className="text-white rounded-full text-[10em] animate-loading-pulse" />

        <Button variant="link" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    );
  }

  Assert.isDefined(callStore.partnerId);

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
