interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function Canvas({ canvasRef }: Props) {
  return <canvas ref={canvasRef} className="border border-gray-300 mt-4" />;
}
