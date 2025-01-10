import { AnimatedParticle } from '../component/AnimatedParticle';

const particlesArray = Array(50);

export function QueueAnimationContainer() {
  return (
    <div className="relative w-72 h-72">
      <div className="absolute inset-0 rounded-full border-4 border-white animate-glow" />

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white text-xl font-medium">Finding match...</span>
      </div>

      {[...particlesArray].map((_, i) => (
        <AnimatedParticle key={`particle-${i}`} index={i} />
      ))}
    </div>
  );
}
