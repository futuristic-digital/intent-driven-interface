import { useCallback, useId, useRef, useState, type RefCallback } from 'react';
import { Button } from '../../ui/button';
import type { ShipmentEdit } from '../../domain/demo-shipments-context';
import type { Shipment, ShipmentState } from '../../domain/shipment';

const SHIPMENT_STATES: ShipmentState[] = ['inTransit', 'delayed', 'delivered'];
const fieldClassName =
  'w-full min-w-0 rounded-md border border-muted-foreground bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function formatDateTimeLocal(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function focusReviewHeading(heading: HTMLHeadingElement | null) {
  heading?.focus();
}

export function UpdateShipmentForm({
  shipment,
  headingRef,
  pending,
  closeError,
  onConfirm,
  onCancel,
}: {
  shipment: Shipment;
  headingRef: RefCallback<HTMLHeadingElement>;
  pending: 'confirmed' | 'cancelled' | null;
  closeError: string | null;
  onConfirm: (edit: ShipmentEdit) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const returningFromReview = useRef(false);
  const formHeadingRef = useCallback(
    (heading: HTMLHeadingElement | null) => {
      headingRef(heading);
      if (heading && document.activeElement !== heading) heading.focus();
    },
    [headingRef]
  );
  const reviewButtonRef = useCallback((button: HTMLButtonElement | null) => {
    if (button && returningFromReview.current) {
      returningFromReview.current = false;
      button.focus();
    }
  }, []);
  const [state, setState] = useState(shipment.state);
  const [carrier, setCarrier] = useState(shipment.carrier);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(() =>
    formatDateTimeLocal(shipment.estimatedDeliveryDate)
  );
  const [delayReason, setDelayReason] = useState(shipment.delayReason ?? '');
  const [lat, setLat] = useState(shipment.actualPosition?.[0].toString() ?? '');
  const [lng, setLng] = useState(shipment.actualPosition?.[1].toString() ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewedEdit, setReviewedEdit] = useState<ShipmentEdit | null>(null);

  const reviewChanges = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending !== null) return;
    setSubmitError(null);

    const nextCarrier = carrier.trim();
    const nextEta = new Date(estimatedDeliveryDate);
    const nextDelayReason = delayReason.trim() || undefined;
    if (state.length === 0) {
      setSubmitError('Choose at least one shipment status.');
      return;
    }
    if (!nextCarrier || Number.isNaN(nextEta.getTime())) {
      setSubmitError(
        'Enter a carrier name and a valid estimated delivery time.'
      );
      return;
    }

    let nextPosition: Shipment['actualPosition'];
    if (lat.trim() || lng.trim()) {
      const latitude = lat.trim() ? Number(lat) : NaN;
      const longitude = lng.trim() ? Number(lng) : NaN;
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      ) {
        setSubmitError(
          'Enter a latitude between −90 and 90 and a longitude between −180 and 180.'
        );
        return;
      }
      nextPosition = [latitude, longitude];
    }

    const edit: ShipmentEdit = {};
    if (
      state.length !== shipment.state.length ||
      state.some((value) => !shipment.state.includes(value))
    )
      edit.state = state;
    if (nextCarrier !== shipment.carrier) edit.carrier = nextCarrier;
    if (
      estimatedDeliveryDate !==
      formatDateTimeLocal(shipment.estimatedDeliveryDate)
    )
      edit.estimatedDeliveryDate = nextEta.toISOString();
    if (nextDelayReason !== shipment.delayReason)
      edit.delayReason = nextDelayReason;
    if (
      nextPosition?.[0] !== shipment.actualPosition?.[0] ||
      nextPosition?.[1] !== shipment.actualPosition?.[1]
    )
      edit.actualPosition = nextPosition;

    if (Object.keys(edit).length === 0) {
      setSubmitError('Change at least one field to update.');
      return;
    }

    setReviewedEdit(edit);
  };

  const toggleState = (s: ShipmentState) => {
    setState((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const cancelButton = (
    <Button
      type="button"
      variant="outline"
      aria-disabled={pending !== null}
      onClick={onCancel}
    >
      {pending === 'cancelled' ? 'Cancelling…' : 'Cancel'}
    </Button>
  );

  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-busy={pending !== null}
      className="space-y-4 rounded-lg border bg-card p-4"
    >
      <h3
        id={`${id}-title`}
        ref={formHeadingRef}
        tabIndex={-1}
        className="font-semibold text-foreground"
      >
        Update delivery details · {shipment.id}
      </h3>
      {reviewedEdit === null ? (
        <form onSubmit={reviewChanges} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Make your changes, then review them before confirming.
          </p>
          <fieldset disabled={pending !== null} className="min-w-0 space-y-4">
            <legend className="sr-only">Delivery details</legend>
            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
                State
              </legend>
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
                      className="rounded border-input focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor={`${id}-carrier`}
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Carrier
              </label>
              <input
                id={`${id}-carrier`}
                type="text"
                required
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className={fieldClassName}
                placeholder="Carrier name"
              />
            </div>

            <div>
              <label
                htmlFor={`${id}-eta`}
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Estimated delivery
              </label>
              <input
                id={`${id}-eta`}
                type="datetime-local"
                required
                aria-describedby={`${id}-eta-help`}
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                className={fieldClassName}
              />
              <p
                id={`${id}-eta-help`}
                className="mt-1 text-xs text-muted-foreground"
              >
                Enter the date and time in your local time zone.
              </p>
            </div>

            <div>
              <label
                htmlFor={`${id}-delay-reason`}
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Delay reason (optional)
              </label>
              <input
                id={`${id}-delay-reason`}
                type="text"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className={fieldClassName}
                placeholder="e.g. Weather"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor={`${id}-latitude`}
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Latitude
                </label>
                <input
                  id={`${id}-latitude`}
                  type="text"
                  value={lat}
                  aria-describedby={`${id}-coordinates-help`}
                  onChange={(e) => setLat(e.target.value)}
                  className={fieldClassName}
                  placeholder="e.g. 48.21"
                />
              </div>
              <div>
                <label
                  htmlFor={`${id}-longitude`}
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Longitude
                </label>
                <input
                  id={`${id}-longitude`}
                  type="text"
                  value={lng}
                  aria-describedby={`${id}-coordinates-help`}
                  onChange={(e) => setLng(e.target.value)}
                  className={fieldClassName}
                  placeholder="e.g. 16.37"
                />
              </div>
              <p
                id={`${id}-coordinates-help`}
                className="col-span-2 text-xs text-muted-foreground"
              >
                Enter both coordinates, or leave both blank.
              </p>
            </div>
          </fieldset>
          <p role="alert" className="text-sm text-destructive empty:m-0">
            {submitError}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {cancelButton}
            <Button
              ref={reviewButtonRef}
              type="submit"
              disabled={pending !== null}
            >
              Review changes
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border bg-background p-4">
            <h4
              ref={focusReviewHeading}
              tabIndex={-1}
              className="text-sm font-semibold"
            >
              Confirm delivery update?
            </h4>
            <p className="text-sm text-muted-foreground">
              This updates the demo only. No real shipment will change.
            </p>
            <dl className="space-y-2 text-sm">
              {reviewedEdit.state && (
                <ReviewField
                  label="State"
                  value={reviewedEdit.state.join(', ')}
                />
              )}
              {reviewedEdit.carrier && (
                <ReviewField label="Carrier" value={reviewedEdit.carrier} />
              )}
              {reviewedEdit.estimatedDeliveryDate && (
                <ReviewField
                  label="Estimated delivery"
                  value={new Date(
                    reviewedEdit.estimatedDeliveryDate
                  ).toLocaleString()}
                />
              )}
              {'delayReason' in reviewedEdit && (
                <ReviewField
                  label="Delay reason"
                  value={reviewedEdit.delayReason ?? 'Not provided'}
                />
              )}
              {'actualPosition' in reviewedEdit && (
                <ReviewField
                  label="Current coordinates"
                  value={
                    reviewedEdit.actualPosition?.join(', ') ?? 'Not provided'
                  }
                />
              )}
            </dl>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {cancelButton}
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null}
              onClick={() => {
                returningFromReview.current = true;
                setReviewedEdit(null);
              }}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              aria-disabled={pending !== null}
              onClick={() => onConfirm(reviewedEdit)}
            >
              {pending === 'confirmed' ? 'Confirming…' : 'Confirm demo update'}
            </Button>
          </div>
        </div>
      )}
      <p role="alert" className="text-sm text-destructive empty:m-0">
        {closeError}
      </p>
    </section>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word">{value}</dd>
    </div>
  );
}
