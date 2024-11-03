import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from './Application.tsx';
import './index.css';
import './features/analytics/faro.ts';

const DYNAMIC_DARK_MODE = window.matchMedia(
  '(prefers-color-scheme:dark)',
).matches;

document.documentElement.classList.toggle('dark', DYNAMIC_DARK_MODE);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
