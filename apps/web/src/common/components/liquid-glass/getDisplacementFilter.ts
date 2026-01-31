import { getDisplacementMap } from './getDisplacementMap';

export interface DisplacementOptions {
  maxHeight: number;
  maxWidth: number;
  radius?: number;
  depth?: number;
  strength?: number;
  chromaticAberration?: number;
}

// Cache for memoized displacement filters
const displacementFilterCache = new Map<string, string>();

export const getDisplacementFilter = ({
  maxHeight,
  maxWidth,
  radius = 0,
  depth = 10,
  strength = 50,
  chromaticAberration = 5,
}: DisplacementOptions) => {
  const cacheKey = `${maxHeight}-${maxWidth}-${radius}-${depth}-${strength}-${chromaticAberration}`;

  const cached = displacementFilterCache.get(cacheKey);
  if (cached) return cached;

  const result =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`<svg height="${maxHeight}" width="${maxWidth}" viewBox="0 0 ${maxWidth} ${maxHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <filter id="displace" color-interpolation-filters="sRGB">
            <feImage x="0" y="0" height="${maxHeight}" width="${maxWidth}" href="${getDisplacementMap(
              {
                maxHeight,
                maxWidth,
                radius,
                depth,
              },
            )}" result="displacementMap" />
            <feDisplacementMap
                transform-origin="center"
                in="SourceGraphic"
                in2="displacementMap"
                scale="${strength + chromaticAberration * 2}"
                xChannelSelector="R"
                yChannelSelector="G"
            />
            <feColorMatrix
            type="matrix"
            values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="displacedR"
                    />
            <feDisplacementMap
                in="SourceGraphic"
                in2="displacementMap"
                scale="${strength + chromaticAberration}"
                xChannelSelector="R"
                yChannelSelector="G"
            />
            <feColorMatrix
            type="matrix"
            values="0 0 0 0 0
                    0 1 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="displacedG"
                    />
            <feDisplacementMap
                    in="SourceGraphic"
                    in2="displacementMap"
                    scale="${strength}"
                    xChannelSelector="R"
                    yChannelSelector="G"
                />
                <feColorMatrix
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 1 0 0
                        0 0 0 1 0"
                result="displacedB"
                        />
              <feBlend in="displacedR" in2="displacedG" mode="screen"/>
              <feBlend in2="displacedB" mode="screen"/>
        </filter>
    </defs>
</svg>`) +
    '#displace';

  displacementFilterCache.set(cacheKey, result);
  return result;
};
