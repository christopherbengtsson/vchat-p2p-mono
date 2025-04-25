import React from 'react';

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const Canvas: React.FC<CanvasProps> = ({ canvasRef }) => {
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full touch-none select-none opacity-80"
      aria-label="Game canvas - control the yellow square with your voice pitch"
      role="img"
      tabIndex={-1}
      style={{
        touchAction: 'none',
      }}
    />
  );
};
