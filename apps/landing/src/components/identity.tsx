export const sourceUrl =
  'https://github.com/futuristic-digital/intent-driven-interface';

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
            d="M24 1l2 15h-4z"
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
      className="size-5 shrink-0"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12,0.3c-6.6,0-12,5.4-12,12c0,5.3,3.4,9.8,8.2,11.4 C8.8,23.8,9,23.4,9,23.1c0-0.3,0-1,0-2c-3.3,0.7-4-1.6-4-1.6c-0.5-1.4-1.3-1.8-1.3-1.8C2.5,17,3.7,17,3.7,17 c1.2,0.1,1.8,1.2,1.8,1.2c1.1,1.8,2.8,1.3,3.5,1c0.1-0.8,0.4-1.3,0.8-1.6c-2.7-0.3-5.5-1.3-5.5-5.9c0-1.3,0.5-2.4,1.2-3.2 C5.5,8.1,5,6.9,5.7,5.3c0,0,1-0.3,3.3,1.2c1-0.3,2-0.4,3-0.4c1,0,2,0.1,3,0.4c2.3-1.6,3.3-1.2,3.3-1.2c0.7,1.7,0.2,2.9,0.1,3.2 c0.8,0.8,1.2,1.9,1.2,3.2c0,4.6-2.8,5.6-5.5,5.9c0.4,0.4,0.8,1.1,0.8,2.2c0,1.6,0,2.9,0,3.3c0,0.3,0.2,0.7,0.8,0.6 c4.8-1.6,8.2-6.1,8.2-11.4C24,5.7,18.6,0.3,12,0.3z"
      />
    </svg>
  );
}
