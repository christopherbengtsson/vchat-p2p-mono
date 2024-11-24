class VolumeProcessor extends AudioWorkletProcessor {
  process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>,
  ) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      let sum = 0;

      // Calculate the RMS (Root Mean Square) of the samples
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);

      // Post the volume level to the main thread
      this.port.postMessage(rms);
    }
    // Return true to keep the processor alive
    return true;
  }
}

// Register the processor
registerProcessor('volumeProcessorService', VolumeProcessor);
