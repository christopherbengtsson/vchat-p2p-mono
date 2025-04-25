import { observer } from 'mobx-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/common/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onClick: VoidFunction;
  gameRound: number;
}

export const StartGameAlertDialog = observer(function StartGameAlertDialog({
  open,
  onClick,
  gameRound,
}: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">
            {gameRound === 0 ? '🎮 Ready to Play!' : '🎮 Your Turn'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-4">
            Fly up and down using your voice, don't hit the walls. The higher
            your pitch, the higher the you fly. Easy peasy lemon squeezy.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction className="w-full mt-4" onClick={onClick}>
            Let's Fly!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
