interface Props {
  ref: React.RefObject<HTMLAudioElement | null>;
  src: string;
  onEnded?: () => void;
}

export function Audio({ ref, src, onEnded }: Props) {
  return <audio ref={ref} src={src} preload="auto" onEnded={onEnded} />;
}
