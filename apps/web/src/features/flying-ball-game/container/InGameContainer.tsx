import { observer } from 'mobx-react';
import { Maybe } from '@mono/common-dto';
import { SpectatorContainer } from './SpectatorContainer';
import { PlayerContainer } from './PlayerContainer';
import { ResultDialogContainer } from './ResultDialogContainer';

interface Props {
  remoteCanvasStream: Maybe<MediaStream>;
  localCanvasAudioStream: Maybe<MediaStream>;
}

export const InGameContainer = observer(function InGameContainer({
  localCanvasAudioStream,
  remoteCanvasStream,
}: Props) {
  return (
    <>
      {localCanvasAudioStream && <PlayerContainer />}

      {remoteCanvasStream && (
        <SpectatorContainer remoteCanvasStream={remoteCanvasStream} />
      )}

      <ResultDialogContainer />
    </>
  );
});
