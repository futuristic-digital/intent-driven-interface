import Image from 'next/image';
import { WorkspaceDemo } from '../components/workspace-demo';
import {
  Brand,
  GitHubMark,
  sections,
  sourceUrl,
} from '../components/identity';

const principles = [
  {
    name: 'Control',
    title: 'You get the final say.',
    detail:
      'You know exactly what each action will do, and it only happens when you press it.',
  },
  {
    name: 'Privacy',
    title: 'Keep the details private.',
    detail:
      'AI can open your customer list without reading your customers’ details.',
  },
  {
    name: 'Offline mode',
    title: 'Nothing leaves your device.',
    detail:
      'In offline mode, everything runs on your device without connecting to the internet.',
    featured: true,
  },
  {
    name: 'Personalization',
    title: 'Put your favorites within reach.',
    detail:
      'Pin the calendar in Week view. Reopen it from the sidebar with Week view still selected.',
  },
  {
    name: 'History',
    title: 'Go back without asking again.',
    detail:
      'Reopen a view you’ve used before, even if you don’t remember how you got there.'
  },
];

const navigation = [
  { label: 'How it works', id: sections.example },
  { label: 'Principles', id: sections.principles },
  { label: 'For developers', id: sections.developers },
];

const labelStyle =
  'flex items-center gap-3 font-mono text-xs font-medium tracking-label uppercase';
const actionStyle =
  'inline-flex min-h-12 items-center justify-center gap-2.5 px-6 text-base font-medium transition-colors';
const headerSourceStyle =
  'min-h-11 items-center gap-2 border border-ink px-3.5 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-paper sm:min-h-0 lg:ml-5';
const mainContentId = 'main';

function DocsLink({ className }: { className: string }) {
  return (
    <a href={`${sourceUrl}#set-up-idi`} className={className}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
        className="size-5 shrink-0"
      >
        <g transform="translate(0.25 0.25)" strokeLinecap="square">
          <line x1="12" y1="4" x2="12" y2="21" strokeLinecap="butt" />
          <path d="M17.5,2c-3,0-5.5,1.3-5.5,3 c0-1.7-2.5-3-5.5-3S1,3.3,1,5v17c0-1.7,2.5-3,5.5-3s5.5,1.3,5.5,3c0-1.7,2.5-3,5.5-3s5.5,1.3,5.5,3V5C23,3.3,20.5,2,17.5,2z" />
        </g>
      </svg>
      Get started
    </a>
  );
}

function SourceLink({ className }: { className: string }) {
  return (
    <a href={sourceUrl} className={className}>
      <GitHubMark />
      View source
    </a>
  );
}

function Header() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-spread flex-wrap items-center justify-between gap-x-5 px-5 sm:px-10 lg:px-16">
        <div className="flex h-15 items-center sm:h-17 lg:h-20">
          <Brand />
        </div>
        <SourceLink className={`inline-flex sm:hidden ${headerSourceStyle}`} />
        <nav
          aria-label="Page sections"
          className="flex w-full items-center justify-between gap-3 border-t border-rule text-sm sm:py-3 sm:ml-auto sm:w-auto sm:gap-6 sm:border-0 lg:gap-9"
        >
          {navigation.map(({ label, id }) => (
            <a
              key={id}
              href={`#${id}`}
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline sm:min-h-0"
            >
              {label}
            </a>
          ))}
        </nav>
        <SourceLink className={`hidden sm:inline-flex ${headerSourceStyle}`} />
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-spread items-center gap-0 px-5 pt-9 pb-12 sm:px-10 md:grid-cols-2 md:gap-9 md:py-18 lg:gap-14 lg:px-16 lg:py-22">
      <div className="contents md:block">
        <h1 className="font-display text-mobile-headline max-md:order-1 leading-[0.95] tracking-display md:text-headline">
          The right controls, <br />
          <em className="relative isolate inline-block after:absolute after:right-0 after:bottom-1 after:left-0 after:-z-10 after:h-2 after:-rotate-1 after:bg-sunflower md:after:h-3 lg:after:h-4">
            at the right time.
          </em>
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted max-md:order-3 md:mt-7 lg:text-xl">
          Tell the app what you want to do, and the AI shows you the controls
          you need. You stay in charge and can see what each action will do
          before you take it.
        </p>
        <div className="mt-6 grid grid-cols-2 items-center gap-2 max-md:order-4 md:mt-8 md:flex md:flex-wrap md:gap-x-6 md:gap-y-4">
          <a
            href="/demo"
            target="_blank"
            rel="noopener"
            className={`${actionStyle} bg-ink text-paper hover:bg-muted max-md:min-h-13 max-md:gap-2 max-md:px-2 max-md:text-sm`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
              className="size-5 shrink-0 text-sunflower"
            >
              <polygon
                points="7 21 7 3 19 12 7 21"
                transform="translate(0.25 0.25)"
                strokeLinecap="square"
              />
            </svg>
            Try the live demo
          </a>
          <DocsLink className="inline-flex min-h-12 items-center gap-2 font-medium underline decoration-rule underline-offset-5 hover:decoration-ink max-md:min-h-13 max-md:justify-center max-md:border max-md:border-ink max-md:px-2 max-md:text-sm max-md:no-underline" />
        </div>
      </div>
      <div className="border border-ink p-1.5 max-md:order-2 max-md:mt-6 max-md:-mr-5 max-md:border-r-0 max-md:bg-paper max-md:pr-0 max-md:shadow-poster-edge max-md:sm:-mr-10 md:mx-1">
        <Image
          src="/human-control-dial.webp"
          alt="A human hand turns a black control dial against a rising sunflower-yellow sun."
          width={1400}
          height={1050}
          preload
          sizes="(min-width: 86rem) 36rem, (min-width: 64rem) calc(-7rem + 50vw), (min-width: 48rem) calc(-5rem + 50vw), 100vw"
          className="aspect-4/3 w-full object-cover md:aspect-square xl:aspect-6/5"
        />
      </div>
    </section>
  );
}

function Principles() {
  return (
    <section
      id={sections.principles}
      className="mx-auto max-w-spread px-5 py-16 sm:px-10 lg:px-16 lg:py-24"
    >
      <h2 className="font-display text-section leading-none tracking-display">
        Five ways you <em className="inline-block">stay in control.</em>
      </h2>
      <ol
        role="list"
        className="mt-7 divide-y divide-rule border-y border-t-2 border-b-rule border-t-ink md:mt-9 lg:mt-11"
      >
        {principles.map(({ name, title, detail, featured }) => (
          <li
            key={name}
            className={`grid gap-2 py-6 md:grid-cols-[8rem_1fr_1.15fr] md:items-center md:gap-6 md:py-6 lg:gap-10 ${featured ? 'relative isolate max-md:-mx-2 max-md:px-3 before:absolute before:inset-y-2 before:-z-10 before:rounded-lg max-md:before:inset-x-0 max-md:before:bg-ink md:before:-inset-x-3 md:before:bg-ink/5' : ''}`}
          >
            <p
              className={`font-mono text-xs tracking-label uppercase ${featured ? 'font-semibold text-ink max-md:text-sunflower' : 'font-medium text-muted'}`}
            >
              {name}
            </p>
            <h3
              className={`font-display leading-tight tracking-tight ${featured ? 'text-4xl underline decoration-sunflower/75 decoration-4 underline-offset-4 max-md:max-w-xs max-md:text-balance max-md:text-paper' : 'text-3xl'}`}
            >
              {title}
            </h3>
            <p
              className={`max-w-lg leading-relaxed ${featured ? 'text-ink max-md:text-paper-muted' : 'text-muted'}`}
            >
              {detail}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Developers() {
  return (
    <section
      id={sections.developers}
      className="border-y border-ink bg-sunflower"
    >
      <div className="mx-auto grid max-w-spread items-start gap-10 px-5 py-14 sm:px-10 md:py-16 lg:grid-cols-[5fr_7fr] lg:gap-14 lg:px-16 lg:py-22">
        <div>
          <p className={labelStyle}>For developers</p>
          <h2 className="mt-5 font-display text-section leading-none tracking-display">
            Bring your React components <em className="inline-block">into the flow.</em>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed">
            “Show me our bookings from Halloween onward.” The model chooses the
            bookings view and sets <code>startDate</code> to October 31. Your
            app renders the calendar with its own booking data.
          </p>
          <p className="mt-4 max-w-lg leading-relaxed">
            Using a coding agent?{' '}
            <a href={`${sourceUrl}#add-skills-to-your-coding-agent`} className="font-medium underline underline-offset-4">
              Add the IDI skills
            </a>.
          </p>
          <div className="mt-7 grid grid-cols-2 items-center gap-2 md:flex md:gap-6">
            <DocsLink
              className={`${actionStyle} bg-ink text-paper hover:bg-muted max-md:min-h-13 max-md:gap-2 max-md:px-2 max-md:text-sm`}
            />
            <SourceLink className="inline-flex items-center gap-2 font-medium underline underline-offset-4 max-md:min-h-13 max-md:justify-center max-md:border max-md:border-ink max-md:text-sm max-md:no-underline" />
          </div>
        </div>
        <figure className="min-w-0 border border-ink bg-paper shadow-print max-md:-mr-5 max-md:border-r-0 max-md:shadow-code-edge max-md:sm:-mr-10">
          <figcaption className="border-b border-rule px-5 py-3 font-mono text-sm">
            bookings.tsx
          </figcaption>
          <pre tabIndex={0} aria-label="Bookings component example" className="overflow-x-auto p-4 font-mono text-xs leading-6 sm:p-5 sm:text-sm">
            <code>{`import { defineIDIComponent, schema }
  from '@intent-driven-interface/frontend';
import { BookingsCalendar } from './BookingsCalendar';

export const bookings = defineIDIComponent({
  title: 'View bookings',
  description: 'Show bookings from a requested date onward.',
  inputSchema: schema.object({
    startDate: schema.iso.date(),
  }),
  component: ({ componentInput }) => (
    <BookingsCalendar startDate={componentInput.startDate} />
  ),
  componentSummary: ({ componentInput }) => (
    <span>Bookings from {componentInput.startDate}</span>
  ),
});`}</code>
          </pre>
        </figure>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <a
        href={`#${mainContentId}`}
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:bg-paper focus:p-3"
      >
        Skip to content
      </a>
      <Header />
      <main id={mainContentId} tabIndex={-1}>
        <Hero />
        <WorkspaceDemo />
        <Principles />
        <Developers />
      </main>
      <footer className="mx-auto flex max-w-spread flex-wrap items-center justify-between gap-3 px-5 py-7 sm:gap-5 sm:px-10 lg:px-16">
        <Brand />
        <SourceLink className="inline-flex items-center gap-2 text-sm hover:underline" />
      </footer>
    </>
  );
}
