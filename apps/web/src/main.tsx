import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from './Application.tsx';
import './index.css';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
