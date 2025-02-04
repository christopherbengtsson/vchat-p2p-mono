import { ShieldAlert } from 'lucide-react';
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
import { LoadingButton } from '../../../common/components/loading-button/LoadingButton';

interface Props {
  open: boolean;
  onCancel: VoidFunction;
  onReport: VoidFunction;
  isLoading: boolean;
}

export function ReportDialog({ open, onCancel, onReport, isLoading }: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              <span>Report user</span>
            </div>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Please let us know if you have encountered any inappropriate
            behavior from the user by reporting them.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onReport} disabled={isLoading}>
            {isLoading && <LoadingButton />}
            {isLoading ? 'Sending report...' : 'Report user'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
