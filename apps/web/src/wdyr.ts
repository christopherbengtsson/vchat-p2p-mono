/// <reference types="@welldone-software/why-did-you-render" />
import React from 'react'; // This import worked.

if (import.meta.env.DEV && Boolean(import.meta.env.VITE_WDYR)) {
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
