import { observer } from 'mobx-react';
import { Camera, Mic } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { LoadingButton } from '../loading-button/LoadingButton';

interface Props {
  open: boolean;
  isLoading: boolean;
  onClick: VoidFunction;
}

export const PermissionsDialog = observer(function PermissionsDialog({
  open,
  isLoading,
  onClick,
}: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Let's get started</AlertDialogTitle>

          <AlertDialogDescription>
            We need permission to start your:
          </AlertDialogDescription>

          <ul className="py-4">
            <li>
              <div className="flex justify-start gap-2 mb-2">
                <Camera />
                Camera
              </div>
            </li>

            <li>
              <div className="flex justify-start gap-2">
                <Mic />
                Microphone
              </div>
            </li>
          </ul>

          <AlertDialogDescription>
            You can always toggle your camera and mic on or off during calls
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction
            className="w-full"
            onClick={onClick}
            disabled={isLoading}
          >
            {isLoading && <LoadingButton />}
            {isLoading ? 'Waiting for permissions...' : 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
