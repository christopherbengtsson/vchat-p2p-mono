import { Wall } from './Wall';

export interface ScaleFactor {
  widthScale: number;
  heightScale: number;
  devicePixelRatio: number;
}

export interface DrawProps {
  ctx: CanvasRenderingContext2D;
  yPos: number;
  walls: Wall[];
  score: number;
  velocity: number;
  scaleFactor: ScaleFactor;
  wallSpeed: number;
}
