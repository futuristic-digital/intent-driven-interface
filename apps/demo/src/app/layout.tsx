import type { Metadata } from 'next';
import { DevelopmentAgentation } from './development-agentation';
import '../index.css';

export const metadata: Metadata = {
  title: 'Flowdock | Intent-Driven Interface live demo',
  description:
    'Try Intent-Driven Interface in a simulated logistics workspace. Ask to compare carriers, view shipments, or draft a delay notice.',
  alternates: { canonical: 'https://www.intent-driven-interface.dev/demo' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&family=Montserrat:wght@100..900&display=fallback"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <DevelopmentAgentation />
      </body>
    </html>
  );
}
