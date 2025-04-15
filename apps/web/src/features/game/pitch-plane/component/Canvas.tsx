interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function Canvas({ canvasRef }: Props) {
  return <canvas ref={canvasRef} className="bg-black opacity-80" />;
}
