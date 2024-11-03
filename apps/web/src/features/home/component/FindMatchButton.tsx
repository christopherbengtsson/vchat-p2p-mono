import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import { Button } from '@/common/components/ui/button';
import { LoadingButton } from '@/common/components/loading-button/LoadingButton';

interface Props {
  connectOrFindMatch: VoidFunction;
  connected: boolean;
  disabled: boolean;
}

export const FindMatchButton = observer(function FindMatchButton({
  connectOrFindMatch,
  connected,
  disabled,
}: Props) {
  return (
    <Button
      asChild={connected ? true : undefined}
      className="w-full"
      onClick={connectOrFindMatch}
      disabled={disabled || !connected}
    >
      {!connected ? (
        <>
          <LoadingButton /> Connecting...
        </>
      ) : (
        <Link to="/call">Find match</Link>
      )}
    </Button>
  );
});