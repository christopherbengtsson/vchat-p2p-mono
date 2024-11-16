interface Props {
  remoteCanvasStreamRef: React.RefObject<HTMLVideoElement>;
}

export function SpectatorVideo({ remoteCanvasStreamRef }: Props) {
  return (
    <video
      id="canvas-video-stream"
      ref={remoteCanvasStreamRef}
      autoPlay
      playsInline
      muted
      className="absolute top-4 left-4 w-auto h-auto max-w-52 md:max-w-96 rounded-lg overflow-hidden shadow-lg"
    />
  );
}
