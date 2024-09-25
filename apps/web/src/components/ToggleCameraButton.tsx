import { MdVideocam, MdVideocamOff } from 'react-icons/md';
import { Button } from '@/components/ui/button';

interface Props {
  localStream: MediaStream | null;
  videoEnabled: boolean;
  onToggle: VoidFunction;
}

export function ToggleCameraButton({
  localStream,
  videoEnabled,
  onToggle,
}: Props) {
  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={onToggle}
      disabled={!localStream}
    >
      {videoEnabled ? (
        <MdVideocam className="h-6 w-6" />
      ) : (
        <MdVideocamOff className="h-6 w-6" />
      )}
    </Button>
  );
}
