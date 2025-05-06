import { useEffect, useState } from 'react';
import { cn } from '@/common/lib/utils';
import { TypographyH1 } from '@/common/components/typography/Typography';

const FADE_OUT_TIMEOUT = 3500;
const HIDE_TIMEOUT = 4000;

export function GameTitle() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    setVisible(true);
    setFadeOut(false);

    const fadeOutTimer = setTimeout(() => {
      setFadeOut(true);
    }, FADE_OUT_TIMEOUT);

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, HIDE_TIMEOUT);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'absolute top-20 left-0 right-0 text-center z-10 pointer-events-none transition-opacity duration-500',
        'animate-in fade-in duration-500',
        fadeOut && 'animate-out fade-out duration-500',
      )}
    >
      <TypographyH1 className="px-4 mx-auto max-w-[80%] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
        Putin's Puppet Falsetto
      </TypographyH1>
    </div>
  );
}
