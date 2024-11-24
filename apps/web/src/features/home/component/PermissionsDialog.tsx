import { Camera, Mic } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/common/components/ui/alert-dialog';
import { LoadingButton } from '@/common/components/loading-button/LoadingButton';

interface Props {
  open: boolean;
  isLoading: boolean;
  onClick: VoidFunction;
}

export function PermissionsDialog({ open, isLoading, onClick }: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Let's get started</AlertDialogTitle>

          <AlertDialogDescription>
            We need the following permissions
          </AlertDialogDescription>

          <ul className="flex flex-col gap-4 py-4">
            <li>
              <div className="flex justify-start gap-2 mb-2">
                <Camera />
                Camera
              </div>

              <AlertDialogDescription>
                You can always turn your camera off during calls
              </AlertDialogDescription>
            </li>

            <li>
              <div className="flex justify-start gap-2">
                <Mic />
                Microphone
              </div>

              <AlertDialogDescription>
                You can always mute your microphone during calls
              </AlertDialogDescription>
            </li>
          </ul>
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
}
