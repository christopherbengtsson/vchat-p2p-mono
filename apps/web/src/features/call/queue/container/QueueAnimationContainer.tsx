import { TypographyP } from '@/common/components/typography/Typography';
import { AnimatedParticle } from '../component/AnimatedParticle';

const particlesArray = Array(50);

export function QueueAnimationContainer() {
  return (
    <div className="relative w-72 h-72">
      <div className="absolute inset-0 bg-background rounded-full border-4 border-current animate-glow" />

      <div className="absolute inset-0 flex items-center justify-center">
        <TypographyP>Finding match...</TypographyP>
      </div>

      {[...particlesArray].map((_, i) => (
        <AnimatedParticle key={`particle-${i}`} />
      ))}
    </div>
  );
}
