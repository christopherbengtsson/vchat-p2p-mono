import { MdCall } from "react-icons/md";
import { Button } from "@/components/ui/button";

type Props = {
  onClick: VoidFunction;
};

export function CallButton({ onClick }: Props) {
  return (
    <Button variant="secondary" size="icon" onClick={onClick}>
      <MdCall className="h-6 w-6" />
    </Button>
  );
}
