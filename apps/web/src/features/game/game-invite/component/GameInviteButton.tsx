import { Gamepad2 } from 'lucide-react';
import { Button } from '@/common/components/ui/button';

interface Props {
  onClick: VoidFunction;
  disabled?: boolean;
}

export function GameInviteButton({ onClick, disabled }: Props) {
  return (
    <Button
      aria-label="Invite to game"
      variant="secondary"
      size="icon"
      onClick={onClick}
      disabled={disabled}
    >
      <Gamepad2 className="h-6 w-6" />
    </Button>
  );
}
