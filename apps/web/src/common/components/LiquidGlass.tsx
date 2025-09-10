export function LiquidGlass() {
  return (
    <svg style={{ display: 'none' }}>
      <filter
        id="filter"
        colorInterpolationFilters="linearRGB"
        filterUnits="objectBoundingBox"
        primitiveUnits="userSpaceOnUse"
      >
        <feDisplacementMap
          in="SourceGraphic"
          in2="SourceGraphic"
          scale="20"
          xChannelSelector="R"
          yChannelSelector="B"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          result="displacementMap"
        />
        <feGaussianBlur
          stdDeviation="3 3"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          in="displacementMap"
          edgeMode="none"
          result="blur"
        />
      </filter>
    </svg>
  );
}
