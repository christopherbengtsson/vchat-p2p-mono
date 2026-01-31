import {
  CSSProperties,
  ReactNode,
  useState,
  useMemo,
  useCallback,
  memo,
} from 'react';
import {
  getDisplacementFilter,
  DisplacementOptions,
} from './getDisplacementFilter';

type Props = DisplacementOptions & {
  children?: ReactNode | undefined;
  blur?: number;
  ripple?: boolean;
};

// Depth reduction factor when ripple effect is active
const RIPPLE_DEPTH_DIVISOR = 0.7;

// Only Chromium-based browsers support SVG filters in backdrop-filter.
const HAS_SVG_SUPPORT = typeof window !== 'undefined' && !!window.chrome;

const GlassElementComponent = ({
  maxHeight,
  maxWidth,
  depth: baseDepth = 10,
  radius = 0,
  children,
  strength = 50,
  chromaticAberration = 5,
  blur = 2,
  ripple = false,
}: Props) => {
  const [clicked, setClicked] = useState(false);
  const depth = baseDepth / (clicked ? RIPPLE_DEPTH_DIVISOR : 1);

  // Memoize filter URL generation to avoid recalculation on every render
  const filterUrl = useMemo(
    () =>
      getDisplacementFilter({
        maxHeight,
        maxWidth,
        radius,
        depth,
        strength,
        chromaticAberration,
      }),
    [maxHeight, maxWidth, radius, depth, strength, chromaticAberration],
  );

  // Memoize full backdrop-filter CSS value
  const backdropFilterValue = useMemo(
    () =>
      HAS_SVG_SUPPORT
        ? `blur(${blur / 2}px) url('${filterUrl}') blur(${blur}px) brightness(1.1) saturate(1.5) `
        : 'blur(3px)',
    [blur, filterUrl],
  );

  const style: CSSProperties = useMemo(
    () => ({
      height: '100%',
      maxHeight: `${maxHeight}px`,
      width: '100%',
      maxWidth: `${maxWidth}px`,
      borderRadius: `${radius}px`,
      backdropFilter: backdropFilterValue,
    }),
    [maxHeight, maxWidth, radius, backdropFilterValue],
  );

  const handleMouseDown = useCallback(() => {
    if (!ripple) return;
    setClicked(true);
  }, [ripple]);

  const handleMouseUp = useCallback(() => {
    if (!ripple) return;
    setClicked(false);
  }, [ripple]);

  return (
    <div
      className={`liquid-glass${ripple ? ' cursor-pointer' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
    </div>
  );
};

// Memoize component to prevent re-renders when props haven't changed
export const GlassElement = memo(GlassElementComponent);
