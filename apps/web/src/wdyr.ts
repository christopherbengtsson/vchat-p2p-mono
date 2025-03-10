/// <reference types="@welldone-software/why-did-you-render" />
import React from 'react';

if (import.meta.env.DEV && import.meta.env.VITE_WDYR_ENABLED === 'true') {
  const { default: wdyr } = await import(
    '@welldone-software/why-did-you-render'
  );

  wdyr(React, {
    include: [/.*/],
    exclude: [/^DataRoutes/, /^BrowserRouter/, /^Link/, /^Route/],
    collapseGroups: true,
    trackHooks: true,
    trackAllPureComponents: true,
    logOnDifferentValues: true,
  });
}
