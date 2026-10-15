import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web only: the page shell for the installable web app served at /m.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <title>PulseCover</title>
        <meta name="description" content="Wearable-powered life and health insurance." />
        <meta name="theme-color" content="#B71234" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="PulseCover" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/m/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/m/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background:#fff;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;overscroll-behavior-y:none}@media (prefers-color-scheme:dark){html,body{background:#121018}}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
