import { MdGamepad } from 'react-icons/md';
import { Button } from '@/common/components/ui/button';

interface Props {
  canvasStream: MediaStream | null;
  onToggle: VoidFunction;
}

export function GameInviteButton({ canvasStream, onToggle }: Props) {
  return (
    <Button
      aria-label={`${canvasStream ? 'End game' : 'Invite to game'}`}
      variant="secondary"
      size="icon"
      onClick={onToggle}
      // disabled={!canvasStream}
    >
      {canvasStream ? (
        <MdGamepad className="h-6 w-6" />
      ) : (
        <MdGamepad className="h-6 w-6" />
      )}
    </Button>
  );
}
