const VIDEO_CONSTRAINS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { min: 10, ideal: 30, max: 30 },
} as const;

const DEFAULT_AUDIO_CONSTRAINS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000, // High quality audio
  channelCount: 1, // Mono audio
} as const;

const GAME_AUDIO_CONSTRAINS = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  sampleRate: 48000, // High quality audio
  channelCount: 1, // Mono audio
} as const;

const requestAudioAndVideoStream = async () => {
  return await navigator.mediaDevices.getUserMedia({
    video: VIDEO_CONSTRAINS,
    audio: DEFAULT_AUDIO_CONSTRAINS,
  });
};

const requestGameAudioStream = async () => {
  return await navigator.mediaDevices.getUserMedia({
    audio: GAME_AUDIO_CONSTRAINS,
    video: false,
  });
};

export const MediaStreamService = {
  requestAudioAndVideoStream,
  requestGameAudioStream,
};
