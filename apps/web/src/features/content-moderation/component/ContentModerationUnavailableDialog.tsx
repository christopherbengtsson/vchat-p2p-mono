import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/common/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onContinue: VoidFunction;
  onCancel: VoidFunction;
}

export function ContentModerationUnavailableDialog({
  open,
  onContinue,
  onCancel,
}: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Safety Note</AlertDialogTitle>

          <AlertDialogDescription>
            Content Moderation is unavailable at the moment. This means that
            content moderation features like nudity detection will not be
            available during your call.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Continue anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
