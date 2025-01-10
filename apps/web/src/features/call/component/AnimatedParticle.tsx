export function AnimatedParticle({ index }: { index: number }) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 120 + (Math.random() * 40 - 20);
  const tx = Math.cos(angle) * radius;
  const ty = Math.sin(angle) * radius;
  const size = 1 + Math.random() * 1.5;

  return (
    <div
      key={`particle-${index}`}
      className="absolute bg-white rounded-full left-1/2 top-1/2 animate-moveToCenter"
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
