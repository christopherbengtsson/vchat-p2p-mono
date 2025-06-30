import { ReactNode } from 'react';
import { RoutePath } from '@/RoutePath';
import { Button } from '../ui/button';
import { TypographyH1, TypographyP } from '../typography/Typography';

interface ErrorDisplayProps {
  title: string;
  message: string;
  actions?: ReactNode;
}

export const ErrorDisplay = ({
  title,
  message,
  actions,
}: ErrorDisplayProps) => {
  return (
    <div className="w-full h-dvh flex items-center justify-center">
      <div className="w-full max-w-lg bg-background flex flex-col items-center p-4 text-center">
        <TypographyH1>{title}</TypographyH1>
        <TypographyP>{message}</TypographyP>
        <div className="mt-6 flex gap-2">{actions}</div>
      </div>
    </div>
  );
};

export const RedirectButton = ({ label }: { label: string }) => {
  const handleClick = () => {
    window.location.href = RoutePath.HOME;
  };

  return (
    <Button variant="outline" onClick={handleClick}>
      {label}
    </Button>
  );
};
