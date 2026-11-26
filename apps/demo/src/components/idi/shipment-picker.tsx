import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useDemoShipments } from '../../domain/demo-shipments-context';
import { Button } from '../../ui/button';

export function ShipmentPicker({
  title,
  label,
  onSelect,
  cancel,
}: {
  title: string;
  label: string;
  onSelect: (shipmentId: string) => void;
  cancel?: {
    label: string;
    variant: 'outline' | 'ghost';
    pending: boolean;
    error: string | null;
    onCancel: (shipmentId: string | null) => void;
  };
}) {
  const { shipments } = useDemoShipments();
  const selectId = useId();
  const titleId = `${selectId}-title`;
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const selectedShipment = shipments.find(({ id }) => id === selectedShipmentId);
  const hasShipments = shipments.length > 0;
  const cancellationPending = cancel?.pending ?? false;

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={cancel?.pending}
      className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground"
    >
      <h3 id={titleId} className="font-semibold">
        {title}
      </h3>
      {!hasShipments && (
        <p className="text-sm text-muted-foreground">No shipments available.</p>
      )}
      {(hasShipments || cancel) && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (selectedShipment && !cancellationPending) {
              onSelect(selectedShipment.id);
            }
          }}
        >
          {hasShipments && (
            <div className="space-y-2">
              <label htmlFor={selectId} className="block text-sm font-medium">
                {label}
              </label>
              <select
                id={selectId}
                required
                disabled={cancellationPending}
                value={selectedShipment?.id ?? ''}
                onChange={(event) =>
                  setSelectedShipmentId(event.currentTarget.value)
                }
                className="min-h-10 w-full min-w-0 rounded-md border border-muted-foreground bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a shipment</option>
                {shipments.map(({ id, origin, destination }) => (
                  <option key={id} value={id}>
                    {`${id} · ${origin.city} → ${destination.city}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          {cancel && (
            <p role="alert" className="text-sm text-destructive">
              {cancel.error}
            </p>
          )}
          <div
            className={
              cancel && 'flex flex-col gap-2 sm:flex-row sm:justify-end'
            }
          >
            {cancel && (
              <Button
                type="button"
                variant={cancel.variant}
                aria-disabled={cancellationPending}
                className="motion-reduce:transition-none"
                onClick={() => {
                  if (!cancellationPending) {
                    cancel.onCancel(selectedShipment?.id ?? null);
                  }
                }}
              >
                {cancellationPending && (
                  <Loader2
                    aria-hidden="true"
                    className="size-4 motion-safe:animate-spin"
                  />
                )}
                {cancellationPending ? 'Cancelling…' : cancel.label}
              </Button>
            )}
            {hasShipments && (
              <Button
                type="submit"
                disabled={cancellationPending || !selectedShipment}
              >
                Continue
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
