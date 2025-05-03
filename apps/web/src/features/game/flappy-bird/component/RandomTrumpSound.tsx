import { useEffect, useMemo, useState } from 'react';
import { Audio } from '@/common/components/audio/Audio';

const TRUMP_START_SOUNDS = ['trump_love_teslur', 'trump_grab_pussy'];
const TRUMP_ENDING_SOUNDS = [
  'trump_bye',
  'trump_we_are_dying',
  'trump_wrong_with_you',
  'trump_bullshit',
];

interface Props {
  ref: React.RefObject<HTMLAudioElement | null>;
  type: 'start' | 'end';
  onReady?: () => void;
  onEnded?: () => void;
}

export function RandomTrumpSound({ ref, onReady, onEnded, type }: Props) {
  const [soundSrc, setSoundSrc] = useState<string>();

  const randomSoundName = useMemo(() => {
    const soundsArray =
      type === 'start' ? TRUMP_START_SOUNDS : TRUMP_ENDING_SOUNDS;

    const index = Math.floor(Math.random() * soundsArray.length);

    return soundsArray[index];
  }, [type]);

  useEffect(() => {
    if (randomSoundName) {
      (async () => {
        const src = await import(`../../../../assets/${randomSoundName}.mp3`);
        setSoundSrc(src.default);
        onReady?.();
      })();
    }
  }, [onReady, randomSoundName]);

  return soundSrc && <Audio ref={ref} src={soundSrc} onEnded={onEnded} />;
}
