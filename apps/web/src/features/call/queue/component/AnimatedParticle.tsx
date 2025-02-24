import { useMemo } from 'react';

export function AnimatedParticle() {
  const { size, tx, ty } = useMemo(() => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 120 + (Math.random() * 40 - 20);

    return {
      tx: Math.cos(angle) * radius,
      ty: Math.sin(angle) * radius,
      size: 1 + Math.random() * 1.5,
    };
  }, []);

  return (
    <div
      className="absolute bg-foreground rounded-full left-1/2 top-1/2 animate-moveToCenter"
      style={
        {
          '--tx': `${tx}px`,
          '--ty': `${ty}px`,
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${1 + Math.random()}s`,
        } as React.CSSProperties
      }
    />
  );
}
