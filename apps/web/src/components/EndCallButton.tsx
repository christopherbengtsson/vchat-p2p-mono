import { MdCallEnd } from "react-icons/md";
import { Button } from "@/components/ui/button";

type Props = {
  onClick: VoidFunction;
};

export function EndCallButton({ onClick }: Props) {
  return (
    <Button variant="destructive" size="icon" onClick={onClick}>
      <MdCallEnd className="h-6 w-6" />
    </Button>
  );
}
