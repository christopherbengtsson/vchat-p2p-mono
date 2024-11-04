import volumeProcessorURL from '@mono/fe-workers/dist/service/VolumeProcessorService?worker&url';

const init = async (
  stream: MediaStream,
  onMessage: (volume: number) => void,
) => {
  const audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule(volumeProcessorURL);

  const sourceNode = audioContext.createMediaStreamSource(stream);
  const volumeNode = new AudioWorkletNode(
    audioContext,
    'volumeProcessorService',
  );

  sourceNode.connect(volumeNode);

  // Handle messages from the AudioWorkletProcessor
  volumeNode.port.onmessage = (event: MessageEvent<number>) => {
    const volume = event.data;
    onMessage(volume);
  };
};

export const AudioContextService = {
  init,
};
