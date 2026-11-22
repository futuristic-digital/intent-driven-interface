import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DevelopmentAgentation } from './development-agentation';
import './globals.css';

export const metadata: Metadata = {
  title: 'Intent-Driven Interface — The right controls, at the right time.',
  description:
    'Tell the app what you want to do. AI brings the right controls into view. You decide what happens next.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <DevelopmentAgentation />
      </body>
    </html>
  );
}
