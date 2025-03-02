import { useCallback, useState } from 'react';
import { observer } from 'mobx-react';
import { toast } from 'sonner';
import { InviteData } from '@mono/common-dto';
import { GameInviteService } from '../service/GameInviteService';
import { GameInviteButton } from '../component/GameInviteButton';
import { InviteAlertDialog } from '../component/InviteAlertDialog';
import { useGameInviteListeners } from '../hooks/useGameInviteListeners';

interface Props {
  userId: string;
  gameActive: boolean;
}

export const GameInviteActionContainer = observer(
  function GameInviteActionContainer({ userId, gameActive }: Props) {
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [disableInviteBtn, setDisableInviteBtn] = useState(false);

    const onMessageCallback = useCallback(
      (inviteData: InviteData) => {
        switch (inviteData.type) {
          case 'INVITE':
            setInviteDialogOpen(true);
            setDisableInviteBtn(true);
            break;

          case 'INVITE_RESPONSE':
            if (inviteData.response === 'ACCEPT') {
              GameInviteService.playerReady(userId, true);
            }

            setDisableInviteBtn(false);

            break;
        }
      },
      [userId],
    );

    useGameInviteListeners(onMessageCallback);

    const handleOnInviteClick = useCallback(() => {
      GameInviteService.sendInvite();
      setDisableInviteBtn(true);
      toast.success('Invitation sent!');
    }, []);

    const handleOnAcceptClick = useCallback(() => {
      GameInviteService.answerInvite(true);
      GameInviteService.playerReady(userId, false);
      setInviteDialogOpen(false);
      setDisableInviteBtn(false);
      toast.success('Invitation accepted');
    }, [userId]);

    const handleOnDeclineClick = useCallback(() => {
      GameInviteService.answerInvite(false);
      setInviteDialogOpen(false);
      setDisableInviteBtn(false);
      toast('Invitation declined');
    }, []);

    return (
      <>
        <GameInviteButton
          onClick={handleOnInviteClick}
          disabled={disableInviteBtn || gameActive}
        />

        <InviteAlertDialog
          open={inviteDialogOpen}
          onAccept={handleOnAcceptClick}
          onDecline={handleOnDeclineClick}
        />
      </>
    );
  },
);
