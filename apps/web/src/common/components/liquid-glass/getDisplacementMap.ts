import { DisplacementOptions } from './getDisplacementFilter';

// Constants for gradient calculations
const GRADIENT_EDGE_PERCENTAGE = 15;

// Cache for memoized displacement maps
const displacementMapCache = new Map<string, string>();

export const getDisplacementMap = ({
  maxHeight,
  maxWidth,
  radius = 0,
  depth = 0,
}: Omit<DisplacementOptions, 'chromaticAberration' | 'strength'>) => {
  const cacheKey = `${maxHeight}-${maxWidth}-${radius}-${depth}`;

  const cached = displacementMapCache.get(cacheKey);
  if (cached) return cached;

  const result =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`<svg height="${maxHeight}" width="${maxWidth}" viewBox="0 0 ${maxWidth} ${maxHeight}" xmlns="http://www.w3.org/2000/svg">
    <style>
        .mix { mix-blend-mode: screen; }
    </style>
    <defs>
        <linearGradient
          id="Y"
          x1="0"
          x2="0"
          y1="${Math.ceil((radius / maxHeight) * GRADIENT_EDGE_PERCENTAGE)}%"
          y2="${Math.floor(100 - (radius / maxHeight) * GRADIENT_EDGE_PERCENTAGE)}%">
            <stop offset="0%" stop-color="#0F0" />
            <stop offset="100%" stop-color="#000" />
        </linearGradient>
        <linearGradient
          id="X"
          x1="${Math.ceil((radius / maxWidth) * GRADIENT_EDGE_PERCENTAGE)}%"
          x2="${Math.floor(100 - (radius / maxWidth) * GRADIENT_EDGE_PERCENTAGE)}%"
          y1="0"
          y2="0">
            <stop offset="0%" stop-color="#F00" />
            <stop offset="100%" stop-color="#000" />
        </linearGradient>
    </defs>

    <rect x="0" y="0" height="${maxHeight}" width="${maxWidth}" fill="#808080" />
    <g filter="blur(2px)">
      <rect x="0" y="0" height="${maxHeight}" width="${maxWidth}" fill="#000080" />
      <rect
          x="0"
          y="0"
          height="${maxHeight}"
          width="${maxWidth}"
          fill="url(#Y)"
          class="mix"
      />
      <rect
          x="0"
          y="0"
          height="${maxHeight}"
          width="${maxWidth}"
          fill="url(#X)"
          class="mix"
      />
      <rect
          x="${depth}"
          y="${depth}"
          height="${maxHeight - 2 * depth}"
          width="${maxWidth - 2 * depth}"
          fill="#808080"
          rx="${radius}"
          ry="${radius}"
          filter="blur(${depth}px)"
      />
    </g>
</svg>`);

  displacementMapCache.set(cacheKey, result);
  return result;
};
