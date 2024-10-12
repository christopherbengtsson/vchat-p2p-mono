import { MdCallEnd } from 'react-icons/md';
import { Button } from '@/components/ui/button';

interface Props {
  onClick: VoidFunction;
}

export function EndCallButton({ onClick }: Props) {
  return (
    <Button
      aria-label="End call"
      variant="destructive"
      size="icon"
      onClick={onClick}
    >
      <MdCallEnd className="h-6 w-6" />
    </Button>
  );
}
