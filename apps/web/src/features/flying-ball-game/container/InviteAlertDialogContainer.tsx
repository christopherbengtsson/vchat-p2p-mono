import { observer } from 'mobx-react';
import { toast } from 'sonner';
import { useCallStore } from '@/features/call/context/useCallStore';
import { InviteAlertDialog } from '../component/InviteAlertDialog';

export const InviteAlertDialogContainer = observer(
  function InviteAlertDialogContainer() {
    const { gameStore } = useCallStore();

    const handleAccept = () => {
      gameStore.answerGameInvite(true);
      toast.success('Invitation accepted');
    };

    const handleDecline = () => {
      gameStore.answerGameInvite(false);
      toast('Invitation declined');
    };

    return (
      <InviteAlertDialog
        open={gameStore.inviteDialogOpen}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    );
  },
);
