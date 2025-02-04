import { useState } from 'react';
import { Button } from '@/common/components/ui/button';

export function UserBannedPage() {
  const [clicked, setClicked] = useState(false);

  const handleOnClick = () => {
    setClicked(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">You are banned</h1>
      <p className="text-lg mb-8 text-center max-w-lg">
        We've received reports about inappropriate behavior on your account.
        You've therefore been banned from using our application. Your ban will
        be lifted in the future and your account is not deleted.
      </p>

      {!clicked ? (
        <Button onClick={handleOnClick} disabled={clicked}>
          I understand and I will stop with my inappropriate behavior
        </Button>
      ) : (
        <p className="text-lg mb-8 text-center max-w-lg">
          Thank you for you understanding.
        </p>
      )}
    </div>
  );
}
