export interface ScaleFactor {
  widthScale: number;
  heightScale: number;
  devicePixelRatio: number;
  deviceScaleFactor: number;
  deviceType: 'MOBILE' | 'TABLET' | 'LAPTOP' | 'DESKTOP';
}

export interface DrawProps {
  ctx: CanvasRenderingContext2D;
  xPos: number;
  yPos: number;
  scaleFactor: ScaleFactor;
  velocity: number;
  pipeSpeed: number;
  frameCount: number;
  deltaTime: number;

  isDead: boolean;
  deathFrames: number;
  playerSize?: number;
}
