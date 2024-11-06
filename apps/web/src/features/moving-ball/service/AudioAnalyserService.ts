// apps/web/src/features/moving-ball/service/AudioContextService.ts

let analyserNode: AnalyserNode;
let dataArray: Uint8Array;

const init = async (stream: MediaStream) => {
  const audioContext = new AudioContext();

  const sourceNode = audioContext.createMediaStreamSource(stream);
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256; // must be a power of two between 32 and 32768

  sourceNode.connect(analyserNode);
  dataArray = new Uint8Array(analyserNode.frequencyBinCount);
};

const getVolume = () => {
  if (!analyserNode || !dataArray) return 0;

  analyserNode.getByteTimeDomainData(dataArray);

  // Compute the RMS of the waveform data
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const value = (dataArray[i] - 128) / 128; // Convert to [-1, 1]
    sum += value * value;
  }
  const rms = Math.sqrt(sum / dataArray.length);
  return rms;
};

const stop = () => {
  if (analyserNode) {
    analyserNode.disconnect();
  }
};

export const AudioAnalyserService = {
  init,
  getVolume,
  stop,
};
