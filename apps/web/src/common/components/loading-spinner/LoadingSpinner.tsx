import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  className?: string;
}

export function LoadingSpinner({ className }: Props) {
  return <Loader2 className={cn('mr-2 h-4 w-4 animate-spin', className)} />;
}
