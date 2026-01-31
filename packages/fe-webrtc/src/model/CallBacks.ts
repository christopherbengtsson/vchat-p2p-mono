import { ChatData } from '@mono/common-dto';

export interface Callbacks {
  handleIncomingChatMessage: (data: ChatData) => void;
  handlePartnerVideoToggle: (toggle: boolean) => void;
  handlePartnerAudioToggle: (toggle: boolean) => void;
  onMessageRateLimited?: VoidFunction;
}
