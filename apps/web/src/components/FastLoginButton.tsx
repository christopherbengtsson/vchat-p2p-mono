import { Loader2, Zap } from "lucide-react";
import { Button } from "./ui/button";

type Props = {
  loading: boolean;
  onClick: VoidFunction;
};

export function FastLoginButton({ loading, onClick }: Props) {
  return (
    <Button onClick={onClick} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Zap className="mr-2 h-4 w-4" />
      )}
      {loading ? "Logging in..." : "Fast login"}
    </Button>
  );
}
