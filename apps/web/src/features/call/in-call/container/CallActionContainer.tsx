import { useCallback } from 'react';
import { observer } from 'mobx-react';
import { MessageCircle } from 'lucide-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { cn } from '@/common/lib/utils';
import { FeatureFlagUtil } from '@/common/utils/FeatureFlagUtil';
import { IS_DARK_MODE } from '@/common/utils/isDarkMode';
import { Button } from '@/common/components/ui/button';
import { Badge } from '@/common/components/ui/badge';
import { GameInviteActionContainer } from '@/features/game/game-invite/container/GameInviteActionContainer';
import { useCallStore } from '../../context/useCallStore';
import { ToggleCameraButton } from '../component/ToggleCameraButton';
import { ToggleMuteButton } from '../component/ToggleMuteButton';
import { EndCallButton } from '../component/EndCallButton';
import { useCallActions } from '../hooks/useCallActions';

interface Props {
  isChatOpen: boolean;
  handleChatToggle: () => void;
}

export const CallActionContainer = observer(function CallActionContainer({
  isChatOpen,
  handleChatToggle,
}: Props) {
  const { mediaStore, socketStore, authStore } = useRootStore();
  const callStore = useCallStore();

  const isGameEnabled = FeatureFlagUtil.isGamesEnabled();
  const { toggleAudio, toggleVideo, endCall } = useCallActions(
    socketStore,
    callStore,
    mediaStore,
  );

  const handleChatButtonClick = useCallback(() => {
    if (!isChatOpen && callStore.showMessageNotification) {
      callStore.hideMessageNotification();
    }

    handleChatToggle();
  }, [callStore, handleChatToggle, isChatOpen]);

  return (
    <div
      className={cn(
        'absolute left-1/2 transform -translate-x-1/2 flex space-x-4 py-2 px-4 backdrop-blur-sm z-50',
        IS_DARK_MODE
          ? 'bottom-8 bg-background/50 rounded-sm'
          : 'bottom-0 bg-muted-foreground/50 rounded-t-sm',
      )}
    >
      <ToggleCameraButton
        localStream={mediaStore.localCallStream}
        videoEnabled={mediaStore.localVideoEnabled}
        onToggle={toggleVideo}
      />

      <ToggleMuteButton
        localStream={mediaStore.localCallStream}
        audioEnabled={mediaStore.localAudioEnabled}
        onToggle={toggleAudio}
      />

      <EndCallButton onClick={endCall} />

      {isGameEnabled && (
        <GameInviteActionContainer
          userId={authStore.userId}
          gameActive={callStore.gameActive}
        />
      )}

      <Button
        onClick={handleChatButtonClick}
        aria-label="Open Chat"
        variant="secondary"
        size="icon"
        className="relative"
      >
        <MessageCircle className="w-5 h-5" />
        {callStore.unreadMessagesCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full px-1 tabular-nums"
          >
            {callStore.unreadMessagesCount}
          </Badge>
        )}
      </Button>
    </div>
  );
});
