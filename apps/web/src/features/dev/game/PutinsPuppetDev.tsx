import { useEffect, useState } from 'react';
import { WebRTCService } from '@mono/fe-webrtc';
import { observer } from 'mobx-react';
import { Maybe } from '@mono/common-dto';
import { VChatSocket } from '@mono/fe-dto';
import { noop } from '../../../common/utils/noop';
import { PlayerContainer } from '../../game/putins-puppet/container/PlayerContainer';
import { PutinsPuppetService } from '../../game/putins-puppet/service/PutinsPuppetService';
import { AssetService } from '../../game/putins-puppet/service/AssetService';

export const PutinsPuppetDev = observer(function PutinsPuppetDev() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    WebRTCService.create({
      observables: {
        socket: {
          id: '123',
          on: noop,
          off: noop,
          emit: noop,
        } as unknown as Maybe<VChatSocket>,
        localStream: { getTracks: () => [] } as unknown as MediaStream,
        roomId: '123',
        partnerSocketId: '456',
        isPolite: true,
      },
      callbacks: {
        handlePartnerVideoToggle: noop,
        handlePartnerAudioToggle: noop,
      },
      setters: {
        setRemoteStream: noop,
        setIsConnected: noop,
      },
    });

    const init = async () => {
      await AssetService.preload();
      PutinsPuppetService.initGamePerquisites().then(() => {
        setIsReady(true);
      });
    };

    init();
  }, []);

  if (!WebRTCService.get() || !isReady) return null;

  return (
    <PlayerContainer onEndRound={noop} onScoreUpdate={noop} score={1337} />
  );
});
