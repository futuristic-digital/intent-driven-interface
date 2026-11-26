import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { useId, useState } from 'react';
import { useDemoShipments } from '../../domain/demo-shipments-context';
import { Button } from '../../ui/button';

function focusHeading(heading: HTMLHeadingElement | null) {
  heading?.focus();
}

export const shipmentDetails = defineIDIComponent({
  title: 'View shipment details',
  description:
    'Show a shipment’s carrier, estimated delivery time, and delay reason without changing the shipment.',
  disableAgentOpen: true,
  disableStandaloneOpen: true,
  inputSchema: schema.object({ shipmentId: schema.string().min(1) }),
  component: function ShipmentDetails({
    componentInput: { shipmentId },
    closeComponent,
  }) {
    const titleId = useId();
    const { shipments } = useDemoShipments();
    const shipment = shipments.find(({ id }) => id === shipmentId);
    const [closing, setClosing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function backToShipments() {
      if (closing) return;
      setClosing(true);
      setError(null);
      try {
        await closeComponent({ agentFollowUp: false });
      } catch {
        setError('Could not return to shipments. Please try again.');
      } finally {
        setClosing(false);
      }
    }

    return (
      <section
        aria-labelledby={titleId}
        aria-busy={closing}
        className="space-y-4 rounded-lg border bg-card p-4"
      >
        <h3
          id={titleId}
          ref={focusHeading}
          tabIndex={-1}
          className="font-semibold"
        >
          Shipment details · {shipmentId}
        </h3>
        {shipment ? (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Carrier</dt>
              <dd>{shipment.carrier}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Estimated delivery
              </dt>
              <dd>
                <time dateTime={shipment.estimatedDeliveryDate}>
                  {new Date(shipment.estimatedDeliveryDate).toLocaleString(
                    undefined,
                    { dateStyle: 'medium', timeStyle: 'short' }
                  )}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Delay reason</dt>
              <dd>{shipment.delayReason || 'Not provided'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Shipment not found.</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          aria-disabled={closing}
          onClick={backToShipments}
        >
          {closing ? 'Returning…' : 'Back to shipments'}
        </Button>
      </section>
    );
  },
  componentSummary: function ShipmentDetailsSummary({
    componentInput: { shipmentId },
  }) {
    return <span>Shipment details · {shipmentId}</span>;
  },
});
