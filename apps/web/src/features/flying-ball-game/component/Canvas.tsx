interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function Canvas({ canvasRef }: Props) {
  return <canvas ref={canvasRef} className="bg-black opacity-80" />;
}
