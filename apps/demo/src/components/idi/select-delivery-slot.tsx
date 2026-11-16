'use client';

import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';

// Date-only values and explicit delivery timezone avoid browser-dependent slot times.
const windowSchema = schema.enum(['morning', 'afternoon', 'evening']);
const deliveryWindows: Record<
  schema.infer<typeof windowSchema>,
  {
    label: string;
    start: string;
    end: string;
  }
> = {
  morning: { label: 'Morning', start: '09:00', end: '12:00' },
  afternoon: { label: 'Afternoon', start: '13:00', end: '17:00' },
  evening: { label: 'Evening', start: '17:00', end: '20:00' },
};
const deliveryTimezone = 'Europe/Berlin';

/** Keep calendar arithmetic independent of browser timezone and daylight saving. */
function calendarDate(date: string, offset = 0) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + offset);
  return result;
}

/** Fictional capacity is stable when the same date is reopened from history. */
function availableWindows(date: string, today: string) {
  const day = calendarDate(date);
  if (date <= today || day.getUTCDay() === 0 || day.getUTCDay() === 6)
    return [];
  return windowSchema.options.filter(
    (_, index) => index !== day.getUTCDate() % windowSchema.options.length
  );
}

const outputSchema = schema.discriminatedUnion('status', [
  schema.object({
    status: schema.literal('confirmed'),
    shipmentId: schema.string(),
    date: schema.iso.date(),
    window: windowSchema,
    start: schema.string(),
    end: schema.string(),
    timezone: schema.literal(deliveryTimezone),
  }),
  schema.object({
    status: schema.literal('cancelled'),
    shipmentId: schema.string(),
  }),
]);

/** Let the user choose a sample delivery window without rescheduling a shipment. */
export const selectDeliverySlot = defineIDIComponent({
  description:
    'Open a calendar and fictional delivery windows for a shipment. Use selectShipment first if the shipment ID is unknown. The user can change the date, choose an available window, and confirm or cancel. Sample availability is weekdays from tomorrow, in Europe/Berlin time, with one fully booked window per day. Confirmation returns a choice to the conversation only; it does not reserve capacity or update the shipment.',
  inputSchema: schema.object({
    shipmentId: schema
      .string()
      .min(1)
      .describe(
        'Existing shipment ID supplied by the user or selectShipment; never invent an ID.'
      ),
    date: schema.iso
      .date()
      .describe(
        'Requested delivery date in YYYY-MM-DD. Resolve relative dates from the supplied browser time. If unspecified, use the next weekday after today. Past dates, today, and weekends have no sample availability.'
      ),
    selectedWindow: windowSchema
      .nullable()
      .describe(
        'Requested morning (09:00–12:00), afternoon (13:00–17:00), or evening (17:00–20:00) window in Europe/Berlin, or null for no preference. An unavailable preference is not silently replaced.'
      ),
  }),
  outputSchema,
  component: function SelectDeliverySlot({
    componentInput,
    setComponentInputState,
    closeComponent,
  }) {
    const id = useId();
    const [busy, setBusy] = useState<'confirmed' | 'cancelled' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: deliveryTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const available = availableWindows(componentInput.date, today);
    const selectedWindow = available.find(
      (window) => window === componentInput.selectedWindow
    );
    const selectedDate = calendarDate(componentInput.date);
    const mondayOffset = (selectedDate.getUTCDay() + 6) % 7;
    const week = Array.from({ length: 7 }, (_, index) =>
      calendarDate(componentInput.date, index - mondayOffset)
    );

    // Changing the day clears the time choice rather than carrying it to a different date.
    function selectDate(date: string) {
      setError(null);
      setComponentInputState((previous) => ({
        ...previous,
        date,
        selectedWindow: null,
      }));
    }

    async function finish(output: schema.infer<typeof outputSchema>) {
      setBusy(output.status);
      setError(null);
      try {
        await closeComponent({ setComponentOutput: output, agentFollowUp: false });
      } catch {
        setError(
          'Could not return your choice to the conversation. Please try again.'
        );
      } finally {
        setBusy(null);
      }
    }

    return (
      <section
        aria-label="Select a fictional delivery slot"
        aria-busy={busy !== null}
        className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground"
      >
        <header className="space-y-1">
          <h3 className="font-semibold">Choose a delivery slot</h3>
          <p className="wrap-break-word text-sm text-muted-foreground">
            Shipment {componentInput.shipmentId}
          </p>
          <p className="text-xs text-muted-foreground">
            Sample availability · All times Europe/Berlin. Selecting a slot does
            not reserve or reschedule a delivery.
          </p>
        </header>

        <fieldset disabled={busy !== null} className="min-w-0 space-y-4">
          <legend className="sr-only">Delivery preferences</legend>
          <div className="space-y-2">
            <label htmlFor={`${id}-date`} className="block text-sm font-medium">
              Delivery date
            </label>
            <input
              id={`${id}-date`}
              type="date"
              value={componentInput.date}
              onChange={(event) => {
                const parsed = schema.iso
                  .date()
                  .safeParse(event.currentTarget.value);
                if (parsed.success) selectDate(parsed.data);
              }}
              className="min-h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:w-auto"
            />
            <p className="text-xs text-muted-foreground">
              Choose any date to browse its week. Deliveries start tomorrow,
              weekdays only.
            </p>
          </div>

          <fieldset className="min-w-0">
            <legend className="sr-only">Days in the selected week</legend>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {week.map((day) => {
                const date = day.toISOString().slice(0, 10);
                const selected = date === componentInput.date;
                const hasAvailability =
                  availableWindows(date, today).length > 0;
                return (
                  <label
                    key={date}
                    className={`relative flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-md border px-1 py-3 text-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    <input
                      type="radio"
                      name={`${id}-day`}
                      value={date}
                      checked={selected}
                      onChange={() => selectDate(date)}
                      className="sr-only"
                      aria-label={`${date}${hasAvailability ? '' : ', no available slots'}`}
                    />
                    <span className="text-xs">
                      {day.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        timeZone: 'UTC',
                      })}
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${hasAvailability ? '' : 'line-through'}`}
                    >
                      {day.getUTCDate()}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Time window · {componentInput.date}
            </legend>
            {windowSchema.options.map((window) => {
              const slot = deliveryWindows[window];
              const enabled = available.includes(window);
              const selected = selectedWindow === window;
              return (
                <label
                  key={window}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors duration-150 focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none ${!enabled ? 'cursor-not-allowed border-border bg-muted text-muted-foreground' : selected ? 'cursor-pointer border-primary bg-primary/10' : 'cursor-pointer border-border hover:border-primary/50'}`}
                >
                  <input
                    type="radio"
                    name={`${id}-window`}
                    value={window}
                    checked={selected}
                    disabled={!enabled}
                    onChange={() => {
                      setError(null);
                      setComponentInputState((previous) => ({
                        ...previous,
                        selectedWindow: window,
                      }));
                    }}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {slot.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {slot.start}–{slot.end}
                    </span>
                  </span>
                  <span
                    className={`text-xs ${selected ? 'font-medium text-primary' : 'text-muted-foreground'}`}
                  >
                    {!enabled
                      ? available.length
                        ? 'Fully booked'
                        : 'Unavailable'
                      : selected
                        ? 'Selected'
                        : 'Available'}
                  </span>
                </label>
              );
            })}
          </fieldset>
        </fieldset>

        <div aria-live="polite" className="text-sm text-muted-foreground">
          {available.length === 0
            ? 'No slots on this date. Choose a future weekday.'
            : selectedWindow
              ? `${deliveryWindows[selectedWindow].label} selected · ${componentInput.date}`
              : componentInput.selectedWindow
                ? 'Your preferred window is fully booked. Choose another window or date.'
                : 'Choose an available time window to continue.'}
        </div>
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            className="motion-reduce:transition-none"
            onClick={() =>
              void finish({
                status: 'cancelled',
                shipmentId: componentInput.shipmentId,
              })
            }
          >
            {busy === 'cancelled' && (
              <Loader2
                aria-hidden="true"
                className="size-4 motion-safe:animate-spin"
              />
            )}
            {busy === 'cancelled' ? 'Cancelling…' : 'Cancel'}
          </Button>
          <Button
            type="button"
            disabled={busy !== null || selectedWindow === undefined}
            className="motion-reduce:transition-none"
            onClick={() => {
              if (selectedWindow) {
                const slot = deliveryWindows[selectedWindow];
                void finish({
                  status: 'confirmed',
                  shipmentId: componentInput.shipmentId,
                  date: componentInput.date,
                  window: selectedWindow,
                  start: slot.start,
                  end: slot.end,
                  timezone: deliveryTimezone,
                });
              }
            }}
          >
            {busy === 'confirmed' && (
              <Loader2
                aria-hidden="true"
                className="size-4 motion-safe:animate-spin"
              />
            )}
            {busy === 'confirmed' ? 'Returning choice…' : 'Confirm selection'}
          </Button>
        </div>
      </section>
    );
  },
  componentSummary: function DeliverySlotSummary({ componentInput }) {
    return (
      <span>
        Delivery slot · {componentInput.shipmentId} · {componentInput.date}
        {componentInput.selectedWindow
          ? ` · ${deliveryWindows[componentInput.selectedWindow].label}`
          : ''}
      </span>
    );
  },
  outputSummary: function DeliverySlotResult(output) {
    return (
      <span>
        {output.status === 'cancelled'
          ? 'Delivery slot selection cancelled'
          : `Selected ${output.date} · ${output.start}–${output.end} ${output.timezone}`}
      </span>
    );
  },
});
