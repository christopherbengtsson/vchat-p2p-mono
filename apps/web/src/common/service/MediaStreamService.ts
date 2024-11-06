const VIDEO_CONSTRAINS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { min: 10, ideal: 30, max: 30 },
} as const;
const AUDIO_CONSTRAINS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000, // High quality audio
  channelCount: 1, // Mono audio
} as const;

const requestAudioAndVideoStream = async () =>
  await navigator.mediaDevices.getUserMedia({
    video: VIDEO_CONSTRAINS,
    audio: AUDIO_CONSTRAINS,
  });

export const MediaStreamService = {
  requestAudioAndVideoStream,
};
