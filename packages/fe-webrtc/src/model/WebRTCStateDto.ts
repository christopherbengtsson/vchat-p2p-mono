import { Maybe } from '@mono/common-dto';
import { Injectables } from './Injectables.js';

export interface WebRTCStateDto {
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  canvasSender: Maybe<RTCRtpSender>;
  remoteVideoChatStreamId: Maybe<string>;
  injectables: Maybe<Injectables>;
}
