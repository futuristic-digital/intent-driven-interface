'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode, Ref } from 'react';
import { sections } from './identity';

const bookingRequest = 'Show me next week’s bookings.';
const campaignRequest =
  'Help me plan reminders for customers due for maintenance.';
const bookingTitle = 'Bookings';
const bookingWeek = 'Week of Nov 23';
const campaignTitle = 'Maintenance campaign';
const stages = {
  bookingMessage: 0,
  calendar: 1,
  campaignMessage: 2,
  collapsingCalendar: 3,
  campaign: 4,
  complete: 5,
};
type PinPhase = 'idle' | 'pressing' | 'flying' | 'settled';
const characterDelay = 29;
const componentReadingTime = 1200;
const pinFlightDuration = 540;
const calendarCollapseDuration = 500;

const calendarDays = [
  { day: 'Mon', date: 23, time: '9:00 AM', job: 'Boiler service' },
  { day: 'Tue', date: 24, time: '11:00 AM', job: 'Heat pump repair' },
  { day: 'Wed', date: 25, time: '10:30 AM', job: 'Annual inspection' },
  { day: 'Thu', date: 26, time: '1:00 PM', job: 'System tune-up' },
  { day: 'Fri', date: 27, time: '9:30 AM', job: 'Boiler service' },
];

function BookingsCard({
  children,
  compact = false,
  ref,
}: {
  children?: ReactNode;
  compact?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      className={`max-w-full rounded-lg border border-rule bg-paper transition-[width] ease-out motion-reduce:transition-none ${compact ? 'w-36' : 'w-full'}`}
      style={{ transitionDuration: `${calendarCollapseDuration}ms` }}
    >
      <div className="px-3 py-2">
        <h3 className="text-sm font-semibold">{bookingTitle}</h3>
        <p className="mt-0.5 text-xs text-muted">{bookingWeek}</p>
      </div>
      {children}
    </div>
  );
}

function BookingsCalendar({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      inert={collapsed}
      className={`grid transition-[grid-template-rows] ease-out motion-reduce:transition-none ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
      style={{ transitionDuration: `${calendarCollapseDuration}ms` }}
    >
      <div className="min-h-0 overflow-hidden">
        {/* Keep the calendar at its expanded width, inside the two card borders. */}
        <ul className="grid w-[calc(100cqw-2px)] gap-2 border-t border-rule p-3 max-sm:divide-y max-sm:divide-rule sm:grid-cols-5 sm:p-4">
          {calendarDays.map(({ day, date, time, job }) => (
            <li
              key={date}
              className="grid grid-cols-[3.5rem_1fr] items-center gap-2 max-sm:pb-2 max-sm:last:pb-0 sm:block"
            >
              <p className="px-1 text-sm font-medium">
                {day} <span className="text-muted">{date}</span>
              </p>
              <div className="rounded border-l-2 border-sunflower bg-ink/5 px-2 py-1.5 max-sm:grid max-sm:grid-cols-[3.65rem_minmax(0,1fr)] max-sm:items-baseline max-sm:gap-x-1 sm:mt-2 sm:min-h-24 sm:px-2.5 sm:py-2">
                <span className="text-xs text-muted">{time}</span>
                <p className="text-sm leading-snug font-medium max-sm:text-[0.8125rem]">
                  {job}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CampaignPlanner() {
  return (
    <div className="rounded-lg border border-rule bg-paper">
      <div className="border-b border-rule p-4 sm:p-5">
        <h3 className="text-xl font-semibold">{campaignTitle}</h3>
      </div>
      <div className="p-4 text-sm sm:p-5">
        <dl className="grid gap-3 min-[360px]:grid-cols-2">
          <div className="min-[360px]:col-span-2">
            <dt className="font-medium">Audience</dt>
            <dd className="mt-1 rounded border border-rule px-3 py-2">
              Customers due for maintenance
            </dd>
          </div>
          <div>
            <dt className="font-medium">Channel</dt>
            <dd className="mt-1 flex items-center justify-between gap-3 rounded border border-rule px-3 py-2">
              Email
              <span
                aria-hidden="true"
                className="mr-0.5 size-1.5 -translate-y-px rotate-45 border-r border-b border-current"
              />
            </dd>
          </div>
          <div>
            <dt className="font-medium">Send date</dt>
            <dd className="mt-1 flex items-center justify-between gap-3 rounded border border-rule px-3 py-2">
              <time dateTime="2026-11-24">Nov 24, 2026</time>
              <span
                aria-hidden="true"
                className="size-3 rounded-xs border border-t-3 border-current"
              />
            </dd>
          </div>
        </dl>
        <span className="mt-3 inline-flex min-h-9 items-center rounded bg-ink px-3 font-medium text-paper">
          Save draft
        </span>
      </div>
    </div>
  );
}

function RequestMessage({
  text,
  characters,
}: {
  text: string;
  characters?: number;
}) {
  const written = characters === undefined ? text : text.slice(0, characters);
  return (
    <div className="ml-auto grid w-fit max-w-[92%] rounded-lg border border-rule bg-ink/5 px-4 py-2.5 text-sm sm:text-base">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {text}
      </span>
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {written || '▏'}
      </span>
    </div>
  );
}

const threadSpacing = 'space-y-5 px-4 py-5 sm:px-7 sm:py-8';

function WorkspaceDemoSize() {
  return (
    <div
      aria-hidden="true"
      className="invisible col-start-1 row-start-1 min-w-0 md:pl-44"
    >
      <div className={threadSpacing}>
        <div>
          <RequestMessage text={bookingRequest} />
        </div>
        {/* Allow space for the taller of the expanded and compact layouts. */}
        <div className="grid pt-9">
          <div className="@container col-start-1 row-start-1">
            <BookingsCard>
              <BookingsCalendar />
            </BookingsCard>
          </div>
          <div className="col-start-1 row-start-1 space-y-5">
            <BookingsCard />
            <CampaignPlanner />
          </div>
        </div>
        <div>
          <RequestMessage text={campaignRequest} />
        </div>
      </div>
    </div>
  );
}

export function WorkspaceDemo() {
  const frame = useRef<HTMLDivElement>(null);
  const bookingsCard = useRef<HTMLDivElement>(null);
  const pinnedCard = useRef<HTMLDivElement>(null);
  const flyingCard = useRef<HTMLDivElement>(null);
  const pinOrigin = useRef<DOMRect | null>(null);
  const [step, setStep] = useState(stages.bookingMessage);
  const [pinPhase, setPinPhase] = useState<PinPhase>('idle');
  const [characters, setCharacters] = useState(0);
  const [started, setStarted] = useState(false);

  const pressingPin = pinPhase === 'pressing';
  const showMobileSidebar = pinPhase === 'flying';
  const pinned = showMobileSidebar || pinPhase === 'settled';
  const compactCalendar = step >= stages.collapsingCalendar;
  const showCampaign = step >= stages.campaign;
  const complete = step === stages.complete && pinPhase === 'settled';
  const writing =
    step === stages.bookingMessage
      ? bookingRequest
      : step === stages.campaignMessage
        ? campaignRequest
        : undefined;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(stages.complete);
      setPinPhase('settled');
      return;
    }

    const element = frame.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setStarted(entry.intersectionRatio >= 0.2);
      },
      { rootMargin: '0px 0px -25% 0px', threshold: 0.2 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pinBookings = useCallback(() => {
    setPinPhase((phase) => (phase === 'idle' ? 'pressing' : phase));
  }, []);

  const replay = useCallback(() => {
    setPinPhase('idle');
    setStep(stages.bookingMessage);
  }, []);

  useEffect(() => {
    if (!started) return;
    if (step === stages.complete) {
      if (!complete) return;
      const timer = window.setTimeout(replay, 6500);
      return () => window.clearTimeout(timer);
    }
    if (step === stages.campaign) {
      const timer = window.setTimeout(() => {
        pinBookings();
        setStep(stages.complete);
      }, componentReadingTime);
      return () => window.clearTimeout(timer);
    }

    const writingInProgress = characters < (writing?.length ?? 0);
    const timer = window.setTimeout(
      () => {
        if (writingInProgress) {
          setCharacters(characters + 1);
        } else {
          setCharacters(0);
          setStep(step + 1);
        }
      },
      writingInProgress
        ? characterDelay
        : step === stages.calendar
          ? componentReadingTime
          : step === stages.collapsingCalendar
            ? calendarCollapseDuration
            : 240
    );
    return () => window.clearTimeout(timer);
  }, [pinBookings, replay, complete, started, step, characters, writing]);

  useEffect(() => {
    if (pinPhase === 'pressing') {
      const timer = window.setTimeout(() => setPinPhase('flying'), 240);
      return () => window.clearTimeout(timer);
    }
    if (pinPhase === 'flying') {
      const timer = window.setTimeout(
        () => setPinPhase('settled'),
        pinFlightDuration +
          (window.matchMedia('(width < 48rem)').matches ? 650 : 0)
      );
      return () => window.clearTimeout(timer);
    }
  }, [pinPhase]);

  useLayoutEffect(() => {
    if (pinPhase === 'pressing') {
      pinOrigin.current = bookingsCard.current?.getBoundingClientRect() ?? null;
      return;
    }
    if (
      pinPhase !== 'flying' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const origin = pinOrigin.current;
    const destination = pinnedCard.current;
    const clone = flyingCard.current;
    const bounds = frame.current?.getBoundingClientRect();
    if (!origin || !destination || !clone || !bounds) return;

    const target = destination.getBoundingClientRect();
    const flight = clone.animate(
      [
        {
          opacity: 0.85,
          transform: `translate(${origin.left - bounds.left}px, ${origin.top - bounds.top}px) scale(1.08)`,
        },
        {
          opacity: 1,
          transform: `translate(${target.left - bounds.left}px, ${target.top - bounds.top}px) scale(1)`,
        },
      ],
      {
        duration: pinFlightDuration,
        easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)',
      }
    );
    const reveal = destination.animate(
      [{ opacity: 0 }, { opacity: 0, offset: 0.97 }, { opacity: 1 }],
      pinFlightDuration
    );
    return () => {
      flight.cancel();
      reveal.cancel();
    };
  }, [pinPhase]);

  return (
    <section
      id={sections.example}
      aria-label="Workspace demo"
      className="bg-ink px-3 py-16 sm:px-10 lg:py-24"
    >
      <div
        ref={frame}
        className="relative mx-auto grid max-w-3xl overflow-hidden rounded-lg sm:rounded-xl border border-dark-rule bg-paper"
      >
        <WorkspaceDemoSize />
        <div
          className={`col-start-1 row-start-1 grid min-w-0 md:transition-[grid-template-columns] md:duration-500 motion-reduce:transition-none ${pinned ? 'md:grid-cols-[11rem_minmax(0,1fr)]' : 'md:grid-cols-[0rem_minmax(0,1fr)]'}`}
        >
          {showMobileSidebar && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10 bg-ink/25 md:hidden"
            />
          )}
          <aside
            aria-label="Pinned views"
            inert={!pinned}
            className={`absolute inset-y-0 left-0 z-20 w-48 max-w-[80%] overflow-hidden border-r border-rule bg-paper transition-[clip-path,visibility] duration-500 motion-reduce:transition-none md:static md:z-auto md:w-auto md:max-w-none md:bg-ink/5 md:[clip-path:none] md:transition-none ${showMobileSidebar ? 'visible [clip-path:inset(0)]' : 'invisible [clip-path:inset(0_100%_0_0)]'} ${pinned ? 'md:visible' : 'md:invisible'}`}
          >
            <div className="min-w-0 px-4 py-3 md:w-44">
              <div ref={pinnedCard} className="w-36 max-w-full">
                <BookingsCard />
              </div>
            </div>
          </aside>

          <ol aria-label="Conversation" className={`min-w-0 ${threadSpacing}`}>
            <li>
              <RequestMessage
                text={bookingRequest}
                characters={
                  step === stages.bookingMessage ? characters : undefined
                }
              />
            </li>
            {step >= stages.calendar && (
              <li className="@container">
                <div className="mb-1 flex justify-start">
                  <button
                    type="button"
                    aria-label={`${pinned ? 'Pinned' : 'Pin'} ${bookingTitle}`}
                    aria-disabled={pinned || pressingPin}
                    onClick={pinBookings}
                    className={`min-h-8 rounded px-2 text-xs font-medium transition-[scale,background-color,box-shadow] duration-150 motion-reduce:transition-none ${pressingPin ? 'scale-90 bg-sunflower ring-4 ring-sunflower/35' : pinned ? 'text-muted' : 'underline decoration-rule underline-offset-4 hover:decoration-ink'}`}
                  >
                    {pinned ? 'Pinned' : 'Pin'}
                  </button>
                </div>
                <BookingsCard ref={bookingsCard} compact={compactCalendar}>
                  <BookingsCalendar collapsed={compactCalendar} />
                </BookingsCard>
              </li>
            )}
            {step >= stages.campaignMessage && (
              <li>
                <RequestMessage
                  text={campaignRequest}
                  characters={
                    step === stages.campaignMessage ? characters : undefined
                  }
                />
              </li>
            )}
            {showCampaign && (
              <li>
                <CampaignPlanner />
              </li>
            )}
          </ol>
        </div>
        <div
          ref={flyingCard}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-40 w-36 origin-top-left opacity-0"
        >
          <BookingsCard />
        </div>
      </div>
      {complete && (
        <div className="relative mx-auto max-w-3xl">
          <button
            type="button"
            onClick={replay}
            className="absolute top-3 right-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-dark-rule px-3 text-sm font-medium text-paper transition-colors hover:border-paper motion-reduce:hidden"
          >
            <svg
              aria-hidden="true"
              className="size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 11a8 8 0 1 1 2.3 6.7M4 5v6h6" />
            </svg>
            Replay
          </button>
        </div>
      )}
    </section>
  );
}
