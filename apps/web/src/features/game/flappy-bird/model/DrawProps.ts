import { Pipe } from './Pipe';

export interface ScaleFactor {
  widthScale: number;
  heightScale: number;
  devicePixelRatio: number;
  deviceType?: 'MOBILE' | 'TABLET' | 'LAPTOP' | 'DESKTOP';
  deviceScaleFactor?: number;
}

export interface DrawProps {
  ctx: CanvasRenderingContext2D;
  yPos: number;
  pipes: Pipe[];
  score: number;
  scaleFactor: ScaleFactor;
  velocity: number;
  pipeSpeed: number;
  frameCount: number;
}
