import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import useSWR, { useSWRConfig } from 'swr';
import { useEffect, useState } from 'react';
import { fetcher, poster, shipmentsApiUrl } from '../../utils/api';
import type { Shipment, ShipmentState } from '../../domain/shipment';

const SHIPMENT_STATES: ShipmentState[] = ['inTransit', 'delayed', 'delivered'];

function formatDateTimeLocal(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const updateShipment = defineIDIComponent({
  description:
    'Open a shipment edit form for status, carrier, estimated delivery, delay reason, and current coordinates. Save changes updates the shipment and shows a success message. Opening the form does not save edits.',
  inputSchema: schema.object({
    shipmentId: schema
      .string()
      .describe(
        'An existing shipment ID, such as shp-1, supplied by the user or returned by selectShipment.'
      ),
  }),
  componentSummary: function UpdateShipmentSummary({ componentInput }) {
    return <span>Update shipment {componentInput.shipmentId}</span>;
  },
  component: function UpdateShipment({ componentInput: { shipmentId } }) {
    const { mutate } = useSWRConfig();
    const key = `${shipmentsApiUrl}/${shipmentId}`;
    const { data: shipment, error, isLoading } = useSWR<Shipment>(key, fetcher);

    const [state, setState] = useState<ShipmentState[]>([]);
    const [carrier, setCarrier] = useState('');
    const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
    const [delayReason, setDelayReason] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
      if (!shipment) return;
      setState(shipment.state ?? []);
      setCarrier(shipment.carrier ?? '');
      setEstimatedDeliveryDate(
        formatDateTimeLocal(shipment.estimatedDeliveryDate)
      );
      setDelayReason(shipment.delayReason ?? '');
      if (shipment.actualPosition) {
        setLat(String(shipment.actualPosition[0]));
        setLng(String(shipment.actualPosition[1]));
      } else {
        setLat('');
        setLng('');
      }
    }, [shipment]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      setSubmitting(true);

      const update: Partial<Shipment> = {};
      if (state.length > 0) update.state = state;
      if (carrier.trim()) update.carrier = carrier.trim();
      if (estimatedDeliveryDate) {
        update.estimatedDeliveryDate = new Date(
          estimatedDeliveryDate
        ).toISOString();
      }
      if (delayReason.trim()) update.delayReason = delayReason.trim();
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        update.actualPosition = [latNum, lngNum];
      }

      if (Object.keys(update).length === 0) {
        setSubmitError('Change at least one field to update.');
        setSubmitting(false);
        return;
      }

      try {
        const updated = await poster<Shipment>(key, update);
        await mutate(key, updated, { revalidate: false });
        await mutate(
          (k) =>
            typeof k === 'string' &&
            (k === shipmentsApiUrl || k.startsWith(`${shipmentsApiUrl}?`)),
          undefined,
          { revalidate: true }
        );
        setSubmitted(true);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setSubmitting(false);
      }
    };

    const toggleState = (s: ShipmentState) => {
      setState((prev) =>
        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
      );
    };

    if (isLoading || !shipment) {
      return (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          {isLoading
            ? 'Loading shipment…'
            : error
              ? 'Failed to load shipment.'
              : null}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load shipment.
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 font-semibold text-foreground">
          Update shipment {shipment.id}
        </h3>
        {submitted ? (
          <p className="text-sm text-green-600 dark:text-green-400">
            Shipment updated successfully.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                State
              </label>
              <div className="flex flex-wrap gap-2">
                {SHIPMENT_STATES.map((s) => (
                  <label
                    key={s}
                    className="inline-flex items-center gap-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={state.includes(s)}
                      onChange={() => toggleState(s)}
                      className="rounded border-input"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Carrier
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Carrier name"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Estimated delivery
              </label>
              <input
                type="datetime-local"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Delay reason (optional)
              </label>
              <input
                type="text"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Weather"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Latitude
                </label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. 48.21"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Longitude
                </label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. 16.37"
                />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </div>
    );
  },
});
