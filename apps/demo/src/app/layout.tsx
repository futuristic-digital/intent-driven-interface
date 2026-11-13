import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'Intent-driven interface demo',
  description: 'A logistics app controlled with natural language.',
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
      <body>{children}</body>
    </html>
  );
}
