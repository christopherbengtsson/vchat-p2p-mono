import { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { toast } from 'sonner';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { InviteAlertDialog } from '../component/InviteAlertDialog';

export const InviteAlertDialogContainer = observer(
  function InviteAlertDialogContainer() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { socketStore, gameStore } = useRootStore();

    useEffect(() => {
      socketStore.maybeSocket?.on('send-game-invite', () => {
        setDialogOpen(true);
      });

      return () => {
        socketStore.maybeSocket?.off('send-game-invite');
      };
    }, [gameStore, socketStore.maybeSocket]);

    const handleAccept = () => {
      setDialogOpen(false);
      gameStore.handleIncomingGameInvitation(true);
      toast.success('Invitation accepted');
    };

    const handleDecline = () => {
      setDialogOpen(false);
      gameStore.handleIncomingGameInvitation(false);
      toast('Invitation declined');
    };

    return (
      <InviteAlertDialog
        open={dialogOpen}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    );
  },
);
