import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { RoutePath } from '@/RoutePath';

export const CONNECTION_TIMEOUT_MS =
  import.meta.env.VITE_CONNECTION_TIMEOUT_MS || 7_000;

export const useConnectionTimeout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate(RoutePath.CALL, { replace: true, state: null });
    }, CONNECTION_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [navigate]);
};
