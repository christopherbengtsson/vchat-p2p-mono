interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function Canvas({ canvasRef }: Props) {
  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      className="border border-gray-300 mt-4"
    />
  );
}
