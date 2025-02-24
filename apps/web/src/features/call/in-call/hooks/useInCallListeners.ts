import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maybe } from '@mono/common-dto';
import { ChatSocket } from '@/stores/model/SocketModel';
import { InCallService } from '../service/InCallService';

export const useInCallListeners = (socket: Maybe<ChatSocket>) => {
  const navigate = useNavigate();

  const onUserLeft = useCallback(() => {
    InCallService.handlePartnerLeftCall(navigate);
  }, [navigate]);

  const onPartnerDisconnected = useCallback(() => {
    InCallService.handlePartnerLeftCall(navigate, true);
  }, [navigate]);

  useEffect(() => {
    socket?.on('user-left', onUserLeft);
    socket?.on('partner-disconnected', onPartnerDisconnected);

    return () => {
      socket?.off('user-left', onUserLeft);
      socket?.off('partner-disconnected', onPartnerDisconnected);
    };
  }, [onPartnerDisconnected, onUserLeft, socket]);
};
