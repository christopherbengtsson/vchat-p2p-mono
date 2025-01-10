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
      <div className="flex flex-col justify-center items-center gap-16 relative min-h-[400px]">
        <div className="relative w-72 h-72">
          {/* Static white glowing border */}
          <div className="absolute inset-0 rounded-full border-4 border-white animate-glow" />

          {/* White pulsing waves */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border-4 border-white/30 animate-pulse-wave"
              style={{
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}

          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-xl font-medium">Searching...</span>
          </div>

          {[...Array(50)].map((_, i) => {
            // Increased randomization
            const angle = Math.random() * Math.PI * 2;
            const radius = 120 + (Math.random() * 40 - 20); // More radius variation
            const tx = Math.cos(angle) * radius;
            const ty = Math.sin(angle) * radius;
            const size = 1 + Math.random() * 1.5; // Random particle sizes

            return (
              <div
                key={`particle-${i}`}
                className="absolute bg-white rounded-full left-1/2 top-1/2 animate-moveToCenter"
                style={
                  {
                    '--tx': `${tx}px`,
                    '--ty': `${ty}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    animationDelay: `${Math.random() * 3}s`, // Longer delay range
                    animationDuration: `${1 + Math.random()}s`, // Random durations
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>

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
