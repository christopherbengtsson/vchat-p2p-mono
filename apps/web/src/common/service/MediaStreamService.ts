import { DeviceService } from './DeviceService';

// Video-Call audio constraints
const CALL_AUDIO_CONSTRAINS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  // autoGainControl: true,
  sampleRate: 48000, // High quality audio
  channelCount: 1, // Mono for voice efficiency
} as const;

const GAME_AUDIO_CONSTRAINS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  sampleRate: 48000, // High quality audio
  channelCount: 1, // Mono for voice efficiency
} as const;

// Mobile constraints - WebRTC will handle quality adaptation
const MOBILE_VIDEO_CONSTRAINS: MediaTrackConstraints = {
  width: { min: 320, ideal: 960, max: 1920 },
  height: { min: 240, ideal: 720, max: 1080 },
  frameRate: { min: 15, ideal: 30, max: 30 },
  aspectRatio: { ideal: 4 / 3 },
  facingMode: 'user',
} as const;

// Tablet/Desktop constraints - WebRTC will handle quality adaptation
const DESKTOP_VIDEO_CONSTRAINS: MediaTrackConstraints = {
  width: { min: 480, ideal: 1280, max: 1920 },
  height: { min: 360, ideal: 720, max: 1080 },
  frameRate: { min: 15, ideal: 30, max: 30 },
  aspectRatio: { ideal: 16 / 9 },
  facingMode: 'user',
} as const;

const _getVideoConstraints = (): MediaTrackConstraints => {
  if (DeviceService.isMobile()) {
    return MOBILE_VIDEO_CONSTRAINS;
  }

  return DESKTOP_VIDEO_CONSTRAINS;
};

const requestAudioAndVideoStream = async () => {
  return await navigator.mediaDevices.getUserMedia({
    video: _getVideoConstraints(),
    audio: CALL_AUDIO_CONSTRAINS,
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
