import { Wall } from './Wall';

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
  walls: Wall[];
  score: number;
  scaleFactor: ScaleFactor;
  velocity: number;
  wallSpeed: number;
  frameCount: number;
}
