import { useRouteError } from 'react-router';
import { CustomError } from '@mono/common-dto';
import { RoutePath } from '@/RoutePath';
import { TypographyH1, TypographyP } from '../typography/Typography';
import { Button } from '../ui/button';

export function ErrorBoundary() {
  const error = useRouteError();

  const handleOnClick = () => {
    window.location.href = RoutePath.AUTH;
  };

  return (
    <div className="w-full h-dvh flex items-center justify-center">
      <div className="w-full max-w-sm bg-background flex flex-col items-center p-4 text-center">
        <TypographyH1>Oops! Something went wrong</TypographyH1>
        <TypographyP>
          {CustomError.isCustomError(error)
            ? error.message
            : 'An unexpected error occurred'}
        </TypographyP>
        <Button className="mt-6" onClick={handleOnClick}>
          Return to Home
        </Button>
      </div>
    </div>
  );
}
