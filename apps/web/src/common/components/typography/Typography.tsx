import { cn } from '../../lib/utils';

interface Props extends React.PropsWithChildren {
  className?: string;
}

export function TypographyH1({ className, children }: Props) {
  return (
    <h1
      className={cn(
        'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function TypographyH2({ className, children }: Props) {
  return (
    <h2
      className={cn(
        'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
        className,
      )}
    >
      {children}
    </h2>
  );
}

interface TypographyPProps extends Props {
  noFirstMarginTop?: boolean;
}

export function TypographyP({
  children,
  className,
  noFirstMarginTop,
}: TypographyPProps) {
  return (
    <p
      className={cn(
        'leading-7',
        className,
        !noFirstMarginTop ? 'not-first:mt-6' : undefined,
      )}
    >
      {children}
    </p>
  );
}
