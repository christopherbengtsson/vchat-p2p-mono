import { observer } from 'mobx-react';

export const BackgroundOverlay = observer(function BackgroundOverlay({
  inCall,
}: {
  inCall: boolean;
}) {
  return (
    !inCall && (
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-90" />
    )
  );
});
