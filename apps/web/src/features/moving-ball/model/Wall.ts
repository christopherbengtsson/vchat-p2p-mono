export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
  passed?: boolean;
  isUpperWall?: boolean;
}
