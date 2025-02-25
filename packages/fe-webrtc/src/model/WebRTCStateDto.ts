export interface WebRTCStateDto {
  makingOffer: boolean;
  ignoreOffer: boolean;
  canvasSender: RTCRtpSender | null;
  remoteVideoChatStreamId: string | null;
}
