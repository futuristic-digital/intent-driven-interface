'use client';

import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';

// Fictional quote contracts and deterministic calendar-day pricing.
const quoteIdSchema = schema.enum([
  'meadow-economy',
  'harbor-standard',
  'comet-express',
]);
const quoteSchema = schema.object({
  id: quoteIdSchema,
  carrierName: schema.string(),
  price: schema.number().positive().describe('Total price in EUR.'),
  currency: schema.literal('EUR'),
  serviceLevel: schema.enum(['Economy', 'Standard', 'Express']),
  deliveryDate: schema.iso.date(),
});
type Quote = schema.infer<typeof quoteSchema>;

const carrierRates: Record<
  Quote['id'],
  Omit<Quote, 'id' | 'deliveryDate'> & { calendarDays: number }
> = {
  'meadow-economy': {
    carrierName: 'Meadow Parcel',
    price: 8.9,
    currency: 'EUR',
    serviceLevel: 'Economy',
    calendarDays: 5,
  },
  'harbor-standard': {
    carrierName: 'Harbor Dispatch',
    price: 13.5,
    currency: 'EUR',
    serviceLevel: 'Standard',
    calendarDays: 3,
  },
  'comet-express': {
    carrierName: 'Comet Courier',
    price: 22,
    currency: 'EUR',
    serviceLevel: 'Express',
    calendarDays: 1,
  },
};

/** UTC date-only arithmetic keeps calendar days independent of timezone and DST. */
function getQuotes(dispatchDate: string): Quote[] {
  return quoteIdSchema.options.map((id) => {
    const { calendarDays, ...rate } = carrierRates[id];
    const delivery = new Date(`${dispatchDate}T00:00:00Z`);
    delivery.setUTCDate(delivery.getUTCDate() + calendarDays);
    return { id, ...rate, deliveryDate: delivery.toISOString().split('T')[0] };
  });
}

/** Inclusive ISO date-only comparisons include delivery on the deadline. */
function meetsDeadline(quote: Quote, deliverBy: string | null) {
  return deliverBy === null || quote.deliveryDate <= deliverBy;
}

function formatPrice(quote: Pick<Quote, 'price' | 'currency'>) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: quote.currency,
  }).format(quote.price);
}

const outputSchema = schema.discriminatedUnion('status', [
  schema.object({
    status: schema.literal('confirmed'),
    shipmentId: schema.string(),
    quote: quoteSchema,
  }),
  schema.object({
    status: schema.literal('cancelled'),
    shipmentId: schema.string(),
  }),
]);

/** Compare demo carriers and return an explicit choice, never a shipment mutation. */
export const compareCarriers = defineIDIComponent({
  description:
    'Compare three carriers by EUR price, delivery date, and service level for a shipment. If the shipment ID is unknown, use selectShipment first. The user can edit an inclusive delivery deadline, select an eligible quote, and confirm or cancel. Dates add calendar days (including weekends), not business days. Confirmation records the selected quote. No matching quotes means no selection can be confirmed.',
  inputSchema: schema.object({
    shipmentId: schema
      .string()
      .min(1)
      .describe(
        'Shipment ID supplied by the user or selectShipment. Use selectShipment first if unknown; never invent an ID.'
      ),
    dispatchDate: schema.iso
      .date()
      .describe(
        'Required dispatch date, YYYY-MM-DD. Use today if no dispatch date is requested. Resolve relative dates using the browser time and timezone supplied with this conversation. Delivery is dispatch plus 5, 3, or 1 calendar days, including weekends.'
      ),
    deliverBy: schema.iso
      .date()
      .nullable()
      .describe(
        'Inclusive latest delivery date, YYYY-MM-DD, or null for no deadline. Quotes arriving after this date remain visible but cannot be selected.'
      ),
    selectedQuoteId: quoteIdSchema
      .nullable()
      .describe(
        'Preselect only a requested quote: meadow-economy (Meadow Parcel, EUR 8.90, +5 calendar days), harbor-standard (Harbor Dispatch, EUR 13.50, +3), or comet-express (Comet Courier, EUR 22.00, +1). Null means no choice. Ineligible quotes cannot be confirmed; never silently substitute another.'
      ),
  }),
  outputSchema,
  component: function CompareCarriers({
    componentInput,
    setComponentInputState,
    closeComponent,
  }) {
    const id = useId();
    const [busy, setBusy] = useState<'confirmed' | 'cancelled' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const quotes = getQuotes(componentInput.dispatchDate);
    const selectedQuote = quotes.find(
      (quote) =>
        quote.id === componentInput.selectedQuoteId &&
        meetsDeadline(quote, componentInput.deliverBy)
    );
    const matchingCount = quotes.filter((quote) =>
      meetsDeadline(quote, componentInput.deliverBy)
    ).length;

    // Only the final explicit action closes the UI and resumes the conversation.
    async function finish(output: schema.infer<typeof outputSchema>) {
      setBusy(output.status);
      setError(null);
      try {
        await closeComponent({ setComponentOutput: output, agentFollowUp: false });
      } catch {
        setError(
          'Could not save your selection. Please try again.'
        );
      } finally {
        setBusy(null);
      }
    }

    return (
      <section
        aria-label="Compare carriers"
        aria-busy={busy !== null}
        className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground"
      >
        <header className="space-y-1">
          <h3 className="font-semibold">Compare carriers</h3>
          <p className="wrap-break-word text-sm text-muted-foreground">
            Shipment {componentInput.shipmentId} · Dispatch{' '}
            <time dateTime={componentInput.dispatchDate}>
              {componentInput.dispatchDate}
            </time>
          </p>
          <p className="text-xs text-muted-foreground">
            Prices in EUR · Delivery estimates include weekends.
          </p>
        </header>

        <fieldset disabled={busy !== null} className="min-w-0 space-y-4">
          <legend className="sr-only">Carrier comparison preferences</legend>
          <div className="space-y-1.5">
            <label
              htmlFor={`${id}-deadline`}
              className="block text-sm font-medium"
            >
              Deliver by{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <input
              id={`${id}-deadline`}
              type="date"
              value={componentInput.deliverBy ?? ''}
              aria-describedby={`${id}-deadline-help`}
              onChange={(event) => {
                const parsed = schema.iso
                  .date()
                  .nullable()
                  .safeParse(event.currentTarget.value || null);
                if (!parsed.success) return;
                const deliverBy = parsed.data;
                setError(null);
                setComponentInputState((previous) => {
                  const previousQuote = getQuotes(previous.dispatchDate).find(
                    (quote) => quote.id === previous.selectedQuoteId
                  );
                  return {
                    ...previous,
                    deliverBy,
                    selectedQuoteId:
                      previousQuote && meetsDeadline(previousQuote, deliverBy)
                        ? previousQuote.id
                        : null,
                  };
                });
              }}
              className="min-h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:w-auto"
            />
            <p
              id={`${id}-deadline-help`}
              className="text-xs text-muted-foreground"
            >
              Delivery on this date qualifies. Clear the date for no deadline.
            </p>
          </div>

          <fieldset className="min-w-0 space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Choose one carrier
            </legend>
            {quotes.map((quote) => {
              const available = meetsDeadline(quote, componentInput.deliverBy);
              const selected = selectedQuote?.id === quote.id;
              return (
                <label
                  key={quote.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors duration-150 focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none ${
                    !available
                      ? 'cursor-not-allowed border-border bg-muted text-muted-foreground'
                      : selected
                        ? 'cursor-pointer border-primary bg-primary/10'
                        : 'cursor-pointer border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`${id}-carrier`}
                    value={quote.id}
                    checked={selected}
                    disabled={!available}
                    onChange={() => {
                      setError(null);
                      setComponentInputState((previous) => ({
                        ...previous,
                        selectedQuoteId: quote.id,
                      }));
                    }}
                    className="mt-1 size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-sm font-medium">
                        {quote.carrierName}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatPrice(quote)}
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {quote.serviceLevel} ·{' '}
                      {carrierRates[quote.id].calendarDays} calendar days
                    </span>
                    <span className="block text-sm">
                      Delivery{' '}
                      <time dateTime={quote.deliveryDate}>
                        {quote.deliveryDate}
                      </time>
                    </span>
                    <span
                      className={`block text-xs ${selected ? 'font-medium text-primary' : 'text-muted-foreground'}`}
                    >
                      {!available
                        ? 'Unavailable · After your deadline'
                        : selected
                          ? 'Selected'
                          : 'Available'}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        </fieldset>

        <div aria-live="polite" className="text-sm text-muted-foreground">
          {matchingCount === 0
            ? 'No carriers meet this deadline. Change or clear it to choose a quote.'
            : selectedQuote
              ? `${selectedQuote.carrierName} selected · ${formatPrice(selectedQuote)}`
              : 'No carrier selected. Choose an available quote to continue.'}
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
            disabled={busy !== null || selectedQuote === undefined}
            className="motion-reduce:transition-none"
            onClick={() => {
              if (selectedQuote) {
                void finish({
                  status: 'confirmed',
                  shipmentId: componentInput.shipmentId,
                  quote: selectedQuote,
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
            {busy === 'confirmed' ? 'Confirming…' : 'Confirm selection'}
          </Button>
        </div>
      </section>
    );
  },
  componentSummary: function CarrierSummary({ componentInput }) {
    return (
      <span>
        Carriers · {componentInput.shipmentId} · Dispatch{' '}
        {componentInput.dispatchDate}
        {componentInput.deliverBy ? ` · By ${componentInput.deliverBy}` : ''}
        {componentInput.selectedQuoteId
          ? ` · ${carrierRates[componentInput.selectedQuoteId].carrierName}`
          : ''}
      </span>
    );
  },
  outputSummary: function CarrierResult(output) {
    return (
      <span>
        {output.status === 'cancelled'
          ? 'Carrier comparison cancelled'
          : `Selected ${output.quote.carrierName} · ${formatPrice(output.quote)} · ${output.quote.serviceLevel} · ${output.quote.deliveryDate}`}
      </span>
    );
  },
});
