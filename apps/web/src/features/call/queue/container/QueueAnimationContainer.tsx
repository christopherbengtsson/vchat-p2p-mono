import { TypographyP } from '@/common/components/typography/Typography';
import { AnimatedParticle } from '../component/AnimatedParticle';

const particlesArray = Array(50);

export function QueueAnimationContainer() {
  return (
    <div className="relative w-72 h-72">
      <div className="absolute inset-0 rounded-full">
        {/* Glow layer (blurred, spinning) */}
        <div className="absolute inset-0 rounded-full p-[6px] bg-conic-gradient animate-spin-slow blur-xl" />

        {/* Border layer */}
        <div className="absolute inset-0 rounded-full p-[4px] bg-conic-gradient animate-spin-slow">
          <div className="w-full h-full rounded-full bg-background" />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <TypographyP>Finding match...</TypographyP>
      </div>

      {[...particlesArray].map((_, i) => (
        <AnimatedParticle key={`particle-${i}`} />
      ))}
    </div>
  );
}
