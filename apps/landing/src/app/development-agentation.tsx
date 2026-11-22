'use client';

import dynamic from 'next/dynamic';

const Agentation =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('agentation').then((module) => module.Agentation), {
        ssr: false,
      })
    : null;

export function DevelopmentAgentation() {
  return Agentation ? <Agentation /> : null;
}
