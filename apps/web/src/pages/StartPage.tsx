import { observer } from "mobx-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useMainStore } from "../stores/MainStoreContext";

export const StartPage = observer(function StartPage() {
  const mainStore = useMainStore();

  const connectOrFindMatch = useCallback(async () => {
    mainStore.findMatch();
  }, [mainStore]);

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-4">
      <Button className="w-full" onClick={connectOrFindMatch}>
        Find match
      </Button>

      <p className="text-primary-foreground">
        Currently {mainStore.nrOfAvailableUsers} more users online
      </p>
    </div>
  );
});
