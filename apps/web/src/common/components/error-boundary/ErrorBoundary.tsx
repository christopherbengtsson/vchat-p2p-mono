import { useRouteError } from 'react-router';
import { CustomError } from '@mono/common-dto';
import { ErrorDisplay, RedirectButton } from '../error-display/ErrorDisplay';

export function ErrorBoundary() {
  const error = useRouteError();

  const errorMessage = CustomError.isCustomError(error)
    ? error.message
    : 'An unexpected error occurred';

  return (
    <ErrorDisplay
      title="Oops! Something went wrong"
      message={errorMessage}
      actions={
        <>
          <RedirectButton label="Try again" />
        </>
      }
    />
  );
}
