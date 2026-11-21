export const sourceUrl =
  'https://github.com/futuristic-digital/intent-driven-interface';
export const docsUrl = sourceUrl + '#use-in-a-host-application';

export const sections = {
  example: 'how-it-works',
  principles: 'principles',
  developers: 'developers',
};

export function SunMark({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className={className}>
      <g fill="currentColor">
        {Array.from({ length: 16 }, (_, ray) => (
          <path
            key={ray}
            d="M21.9 1h4.2l-.8 15h-2.6z"
            transform={`rotate(${ray * 22.5} 24 24)`}
          />
        ))}
        <circle cx="24" cy="24" r="8.5" />
      </g>
    </svg>
  );
}

export function Brand() {
  return (
    <a
      href="#"
      aria-label="Intent-Driven Interface home"
      className="group inline-flex items-center gap-2.5"
    >
      <SunMark className="size-9 text-sunflower transition-transform group-hover:rotate-12" />
      <span className="font-sans text-3xl leading-none font-bold tracking-tighter">
        IDI
      </span>
      <span className="ml-1 border-l border-rule pl-3 text-xs leading-tight font-medium">
        Intent-Driven
        <br />
        Interface
      </span>
    </a>
  );
}

export function GitHubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M12 .8a11.3 11.3 0 0 0-3.57 22.02c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.51-1.3-1.26-1.65-1.26-1.65-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.51-2.51-.29-5.15-1.26-5.15-5.59 0-1.24.44-2.25 1.16-3.04-.11-.29-.5-1.44.11-3 0 0 .95-.3 3.11 1.16a10.8 10.8 0 0 1 5.66 0c2.16-1.46 3.1-1.16 3.1-1.16.62 1.56.23 2.71.12 3 .73.79 1.16 1.8 1.16 3.04 0 4.34-2.65 5.3-5.17 5.58.41.35.77 1.04.77 2.1v3.08c0 .3.2.65.78.54A11.3 11.3 0 0 0 12 .8Z" />
    </svg>
  );
}
