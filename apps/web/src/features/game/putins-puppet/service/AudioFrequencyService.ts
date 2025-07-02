import { PitchDetector } from 'pitchy';

// Audio processing constants optimized for pitch-to-position mapping control
const FTT_SIZE = 2048;
const SMOOTHING_FACTOR = 0.85;
const MIN_VOLUME_DECIBELS = -30; // Sensitive enough for consistent pitch detection across microphone types

export class AudioFrequencyService {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private source: MediaStreamAudioSourceNode;
  private detector: PitchDetector<Float32Array>;
  private input: Float32Array;

  // Optimized for smooth pitch-to-position mapping (humming/vocal tones control player height)
  static readonly MAX_FREQUENCY = 800;
  static readonly PITCH_THRESHOLD = 0;
  static readonly CLARITY_THRESHOLD = 0.25;

  constructor(stream: MediaStream) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = SMOOTHING_FACTOR;
    this.analyser.fftSize = FTT_SIZE;

    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);
    this.detector.minVolumeDecibels = MIN_VOLUME_DECIBELS;

    this.input = new Float32Array(this.detector.inputLength);
  }

  public getPitch(): [number, number] {
    this.analyser.getFloatTimeDomainData(this.input);
    const [pitch, clarity] = this.detector.findPitch(
      this.input,
      this.audioContext.sampleRate,
    );

    // Debug logging in development
    if (import.meta.env.DEV && (pitch > 0 || clarity > 0)) {
      console.debug(
        `Audio Debug - Pitch: ${pitch.toFixed(2)}, Clarity: ${clarity.toFixed(2)}`,
      );
    }

    return [pitch, clarity];
  }

  public close() {
    this.source.disconnect();
    this.analyser.disconnect();

    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
