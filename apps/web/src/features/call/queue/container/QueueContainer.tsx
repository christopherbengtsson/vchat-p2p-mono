import { observer } from 'mobx-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/common/components/ui/button';
import { RoutePath } from '@/RoutePath';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useOnMatchFound } from '../hooks/useMatchListener';
import { useFindMatchOnMount as useFindMatchOnMount } from '../hooks/useFindMatch';
import { QueueAnimationContainer } from './QueueAnimationContainer';

export const QueueContainer = observer(function QueuePage() {
  const { socketStore, authStore, mediaStore } = useRootStore();
  const navigate = useNavigate();

  useOnMatchFound(socketStore.socket);
  useFindMatchOnMount({
    socket: socketStore.socket,
    socketId: socketStore.socket?.id,
    userId: authStore.userId,
  });

  const handleCancel = () => {
    socketStore.socket?.emit('cancel-match', authStore.userId);
    mediaStore.closeAudioAndVideoStream();
    navigate(RoutePath.HOME);
  };

  return (
    <div className="flex flex-col justify-center items-center gap-16 relative min-h-[400px]">
      <QueueAnimationContainer />

      <Button variant="link" onClick={handleCancel}>
        Cancel
      </Button>
    </div>
  );
});
