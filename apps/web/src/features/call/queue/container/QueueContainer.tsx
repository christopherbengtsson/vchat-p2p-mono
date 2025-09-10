import { observer } from 'mobx-react';
import { useNavigate } from 'react-router';
import { Button } from '@/common/components/ui/button';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import { RoutePath } from '@/RoutePath';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useOnMatchFound } from '../hooks/useOnMatchFound';
import { useFindMatchOnMount } from '../hooks/useFindMatchOnMount';
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
    mediaStore.closeLocalCallStream();
    RouterStateUtil.clear();
    navigate(RoutePath.HOME);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative pointer-events-auto">
        <QueueAnimationContainer />

        <div className="absolute w-full flex justify-center mt-6 top-full">
          <Button
            className="liquid-glass text-foreground"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
});
