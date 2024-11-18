import { Gamepad2 } from 'lucide-react';
import { Button } from '@/common/components/ui/button';

interface Props {
  onToggle: VoidFunction;
  gameActive: boolean;
}

export function GameInviteButton({ onToggle, gameActive }: Props) {
  return (
    <Button
      aria-label={`${gameActive ? 'Game is active' : 'Invite to game'}`}
      variant="secondary"
      size="icon"
      onClick={onToggle}
      disabled={gameActive}
    >
      <Gamepad2 className="h-6 w-6" />
    </Button>
  );
}
