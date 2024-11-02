import { useEffect, useState } from 'react';

export const useIsDesktop = (): boolean => {
  const mediaQuery = '(min-width: 768px)';
  const matchQueryList = window.matchMedia(mediaQuery);
  const [isMatch, setMatch] = useState<boolean>(false);
  const onChange = (e: MediaQueryListEvent) => setMatch(e.matches);

  useEffect(() => {
    setMatch(matchQueryList.matches);
    matchQueryList.addEventListener('change', onChange);

    return () => matchQueryList.removeEventListener('change', onChange);
  }, [matchQueryList]);

  return isMatch;
};
