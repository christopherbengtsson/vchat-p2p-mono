interface Props {
  background?: 'bg-card' | 'bg-background' | 'transparent';
}

export function OrDivider({ background = 'bg-card' }: Props) {
  return (
    <div className="relative w-full m-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t"></span>
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className={`${background} px-2 text-muted-foreground`}>or</span>
      </div>
    </div>
  );
}
