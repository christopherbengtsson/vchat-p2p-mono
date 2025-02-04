import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export const TestWithQueryContext: React.FC<
  React.PropsWithChildren<{ queryClient?: QueryClient }>
> = ({ children, queryClient }) => {
  const [client] = useState(() => queryClient ?? new QueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
