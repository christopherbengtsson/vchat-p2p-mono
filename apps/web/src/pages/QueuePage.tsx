import { observer } from 'mobx-react';
import { useNavigate } from 'react-router-dom';
import { MdTravelExplore } from 'react-icons/md';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useMainStore } from '../stores/MainStoreContext';
import { AppState } from '../stores/model/AppState';

export const QueuePage = observer(function QueuePage() {
  const mainStore = useMainStore();
  const navigate = useNavigate();

  const handleCancel = () => {
    mainStore.cancelMatch();
    navigate(-1);
  };

  if (mainStore.appState === AppState.IN_QUEUE) {
    return (
      <div className="flex flex-col justify-center items-center gap-16 ">
        <MdTravelExplore className="text-white rounded-full text-[10em] animate-loading-pulse" />

        <Button variant="link" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center gap-6">
      <div className="flex gap-4">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="you" />
          <AvatarFallback>CB</AvatarFallback>
        </Avatar>

        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="partner" />
          <AvatarFallback>RN</AvatarFallback>
        </Avatar>
      </div>

      <p className="text-primary-foreground">
        Match with {mainStore.partnerId}
      </p>
    </div>
  );
});
