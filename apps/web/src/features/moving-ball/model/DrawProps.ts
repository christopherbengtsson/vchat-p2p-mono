import { Wall } from './Wall';

export interface DrawProps {
  ctx: CanvasRenderingContext2D;
  yPos: number;
  walls: Wall[];
  score: number;
}
