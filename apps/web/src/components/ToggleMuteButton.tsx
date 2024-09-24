import { MdMic, MdMicOff } from "react-icons/md";
import { Button } from "@/components/ui/button";

type Props = {
  localStream: MediaStream | null;
  audioEnabled: boolean;
  onToggle: VoidFunction;
};

export function ToggleMuteButton({
  localStream,
  audioEnabled,
  onToggle,
}: Props) {
  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={onToggle}
      disabled={!localStream}
    >
      {audioEnabled ? (
        <MdMic className="h-6 w-6" />
      ) : (
        <MdMicOff className="h-6 w-6" />
      )}
    </Button>
  );
}
