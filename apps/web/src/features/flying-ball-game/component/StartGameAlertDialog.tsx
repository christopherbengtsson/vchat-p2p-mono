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

export function StartGameAlertDialog({ open, onClick, gameRound }: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {gameRound <= 1 ? 'Invite accepted, get ready!' : 'Your turn'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Move the ball using your voice, don't hit the walls. Easy peasy
            lemon squeezy.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction className="w-full mt-4" onClick={onClick}>
            Play
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
