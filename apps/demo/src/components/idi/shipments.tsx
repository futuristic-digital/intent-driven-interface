import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { useCallback, useId, useState, type ReactElement } from 'react';
import type { ShipmentState } from '../../domain/shipment';
import { Button } from '../../ui/button';
import { Shipments } from '../shipments';
import type { componentMap } from './component-map';

const shipmentSchema = schema.object({
  displayType: schema
    .enum(['list', 'map'])
    .describe('Use map unless the user asks for a list or table.'),
  filter: schema
    .enum(['inTransit', 'delayed', 'delivered'])
    .describe(
      'Shipment status to display. Use inTransit when no status is requested.'
    ),
});

const statusLabels: Record<ShipmentState, string> = {
  inTransit: 'In transit',
  delayed: 'Delayed',
  delivered: 'Delivered',
};

const displayLabels = { list: 'List', map: 'Map' };
const maxDispatchNoteLength = 1_000;
const fieldClassName =
  'rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function focusShipmentsHeading(heading: HTMLHeadingElement | null) {
  if (heading && document.activeElement === document.body) heading.focus();
}

export const showShipments = defineIDIComponent({
  title: 'View shipments',
  description:
    'Show shipments on a map or in a list, filtered by status. The user can change the status filter or view, open shipment details, or review and confirm a demo delivery update. An optional dispatch note is saved in the chat when this card closes and does not change shipments.',
  inputSchema: shipmentSchema,
  outputSchema: schema.object({
    note: schema.string().min(1).max(maxDispatchNoteLength),
  }),
  component: function ShowShipments({
    componentInput,
    setComponentInput,
    componentOutput,
    setComponentOutput,
    useOpenComponent,
    closeComponent,
  }): ReactElement {
    const id = useId();
    const openComponent = useOpenComponent<typeof componentMap>();
    const [mapUnavailable, setMapUnavailable] = useState(false);
    const [closing, setClosing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const displayType = mapUnavailable ? 'list' : componentInput.displayType;
    const handleMapUnavailable = useCallback(() => setMapUnavailable(true), []);

    async function closeShipments() {
      if (closing) return;
      setClosing(true);
      setError(null);
      try {
        await closeComponent({ agentFollowUp: false });
      } catch {
        setError('Could not close shipments. Please try again.');
      } finally {
        setClosing(false);
      }
    }

    return (
      <section
        aria-labelledby={`${id}-title`}
        aria-busy={closing}
        className="min-w-0 space-y-4 rounded-lg border bg-card p-4"
      >
        <h3
          id={`${id}-title`}
          ref={focusShipmentsHeading}
          tabIndex={-1}
          className="font-semibold"
        >
          Shipments
        </h3>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <select
            aria-label="Status"
            value={componentInput.filter}
            disabled={closing}
            className={fieldClassName}
            onChange={(event) => {
              const filter = shipmentSchema.shape.filter.safeParse(
                event.currentTarget.value
              );
              if (filter.success) {
                setComponentInput((previous) => ({
                  ...previous,
                  filter: filter.data,
                }));
              }
            }}
          >
            {shipmentSchema.shape.filter.options.map((filter) => (
              <option key={filter} value={filter}>
                {statusLabels[filter]}
              </option>
            ))}
          </select>
          <div role="group" aria-label="Shipment view" className="flex gap-2">
            {shipmentSchema.shape.displayType.options.map((view) => (
              <Button
                key={view}
                type="button"
                size="sm"
                variant={displayType === view ? 'secondary' : 'outline'}
                aria-pressed={displayType === view}
                aria-disabled={closing || (view === 'map' && mapUnavailable)}
                onClick={() => {
                  if (
                    closing ||
                    displayType === view ||
                    (view === 'map' && mapUnavailable)
                  )
                    return;
                  setComponentInput((previous) => ({
                    ...previous,
                    displayType: view,
                  }));
                }}
              >
                {displayLabels[view]}
              </Button>
            ))}
          </div>
        </div>
        {mapUnavailable && (
          <p role="status" className="text-sm text-muted-foreground">
            The map isn’t available. Use the list to view shipments.
          </p>
        )}
        <Shipments
          displayType={displayType}
          filter={componentInput.filter}
          onMapUnavailable={handleMapUnavailable}
          actionsDisabled={closing}
          onViewDetails={(shipmentId) =>
            openComponent(
              'shipmentDetails',
              { shipmentId },
              { reopenThisComponentOnClose: true }
            )
          }
          onUpdateDelivery={(shipmentId) =>
            openComponent(
              'updateShipment',
              { shipmentId },
              { reopenThisComponentOnClose: true }
            )
          }
        />
        <div className="space-y-1.5">
          <label htmlFor={`${id}-note`} className="block text-sm font-medium">
            Dispatch note (optional)
          </label>
          <textarea
            id={`${id}-note`}
            aria-describedby={`${id}-note-help`}
            rows={2}
            maxLength={maxDispatchNoteLength}
            value={componentOutput?.note ?? ''}
            disabled={closing}
            className={`${fieldClassName} w-full resize-y`}
            onChange={(event) => {
              const note = event.currentTarget.value;
              setComponentOutput(note ? { note } : undefined);
            }}
          />
          <p id={`${id}-note-help`} className="text-xs text-muted-foreground">
            When you close this card or open another, your note is saved in this
            chat. It won’t change any shipment.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            aria-disabled={closing}
            onClick={closeShipments}
          >
            {closing ? 'Closing…' : 'Close'}
          </Button>
        </div>
      </section>
    );
  },
  componentSummary: function ShipmentsSummary({ componentInput }) {
    return (
      <span>
        Shipments · {statusLabels[componentInput.filter]} ·{' '}
        {displayLabels[componentInput.displayType]}
      </span>
    );
  },
  outputSummary: function DispatchNoteSummary({ note }) {
    return <span className="whitespace-pre-wrap">Dispatch note: {note}</span>;
  },
});
