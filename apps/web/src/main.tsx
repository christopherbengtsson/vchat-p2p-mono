import './wdyr.ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './features/analytics/faro.ts';
import { IS_DARK_MODE } from './common/utils/isDarkMode.ts';
import { Application } from './Application.tsx';

document.documentElement.classList.toggle('dark', IS_DARK_MODE);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
