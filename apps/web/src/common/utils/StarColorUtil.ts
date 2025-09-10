const colors = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#feca57',
  '#ff9ff3',
  '#54a0ff',
  '#5f27cd',
  '#00d2d3',
  '#ff9f43',
  '#10ac84',
  '#ee5a24',
  '#0abde3',
  '#c44569',
  '#f8b500',
] as const;

export type StarColor = (typeof colors)[number];

const getRandom = (): StarColor =>
  colors[Math.floor(Math.random() * colors.length)];

export const StarColorUtil = {
  colors,
  getRandom,
};
