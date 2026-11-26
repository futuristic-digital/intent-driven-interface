import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useDemoShipments } from '../domain/demo-shipments-context';
import type { ShipmentState } from '../domain/shipment';
import { Button } from '../ui/button';
import type { Marker } from './map';

const ShipmentMap = dynamic(() => import('./map').then(({ Map }) => Map), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="flex h-96 items-center justify-center rounded-lg bg-muted/80 text-sm font-medium text-muted-foreground"
    >
      Loading map…
    </div>
  ),
});

// Vienna, Austria; the map fits the displayed shipments after loading.
const initialMapView: { position: [number, number]; zoom: number } = {
  position: [16.37, 48.21],
  zoom: 9,
};

type ShipmentActions = {
  actionsDisabled: boolean;
  onViewDetails: (shipmentId: string) => void;
  onUpdateDelivery: (shipmentId: string) => void;
};

function ShipmentActionButtons({
  shipmentId,
  actionsDisabled,
  onViewDetails,
  onUpdateDelivery,
}: ShipmentActions & { shipmentId: string }) {
  return (
    <div
      role="group"
      aria-label={`Actions for shipment ${shipmentId}`}
      className="mt-1 flex flex-col items-start gap-1"
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-auto min-h-8 max-w-full whitespace-normal wrap-anywhere text-left"
        aria-disabled={actionsDisabled}
        onClick={() => {
          if (!actionsDisabled) onViewDetails(shipmentId);
        }}
      >
        View details
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-auto min-h-8 max-w-full whitespace-normal wrap-anywhere text-left"
        aria-disabled={actionsDisabled}
        onClick={() => {
          if (!actionsDisabled) onUpdateDelivery(shipmentId);
        }}
      >
        Update delivery details
      </Button>
    </div>
  );
}

export function Shipments({
  displayType,
  filter,
  onMapUnavailable,
  actionsDisabled,
  onViewDetails,
  onUpdateDelivery,
}: ShipmentActions & {
  displayType: 'map' | 'list';
  filter: ShipmentState;
  onMapUnavailable: () => void;
}) {
  const { shipments: allShipments } = useDemoShipments();
  const shipments = useMemo(
    () => allShipments.filter((shipment) => shipment.state.includes(filter)),
    [allShipments, filter]
  );

  const markers = useMemo<Marker[]>(() => {
    if (displayType === 'list') return [];

    return shipments.map((shipment) => {
      const isDelivered = shipment.state.includes('delivered');
      const isDelayed = shipment.state.includes('delayed');

      const borderColor = isDelivered
        ? 'border-green-500'
        : isDelayed
          ? 'border-red-500'
          : 'border-accent';

      const bgColor = isDelivered
        ? 'bg-green-500/30'
        : isDelayed
          ? 'bg-red-500/30'
          : 'bg-accent/30';

      const position = shipment.actualPosition || shipment.origin.position;

      const label = `Shipment ${shipment.id}`;
      const popup = (
        <div className="max-w-[220px] space-y-1 wrap-anywhere text-xs text-muted-foreground">
          <div className="mb-1 pr-8 text-sm font-semibold">{label}</div>
          <div>
            <span className="font-medium">State:</span>{' '}
            {shipment.state.join(', ')}
          </div>
          <div>
            <span className="font-medium">From:</span> {shipment.origin.city},{' '}
            {shipment.origin.country}
          </div>
          <div>
            <span className="font-medium">To:</span> {shipment.destination.city}
            , {shipment.destination.country}
          </div>
          <div>
            <span className="font-medium">ETA:</span>{' '}
            {formatEta(shipment.estimatedDeliveryDate)}
          </div>
          <ShipmentActionButtons
            shipmentId={shipment.id}
            actionsDisabled={actionsDisabled}
            onViewDetails={onViewDetails}
            onUpdateDelivery={onUpdateDelivery}
          />
        </div>
      );

      return {
        label,
        position,
        bgColor,
        borderColor,
        popup,
      };
    });
  }, [displayType, shipments, actionsDisabled, onViewDetails, onUpdateDelivery]);

  if (displayType === 'map') {
    return (
      <div className="relative">
        <ShipmentMap
          initial={initialMapView}
          markers={markers}
          onUnavailable={onMapUnavailable}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        role={shipments.length > 0 ? 'region' : undefined}
        aria-label={shipments.length > 0 ? 'Shipments' : undefined}
        tabIndex={shipments.length > 0 ? 0 : undefined}
        className="overflow-x-auto rounded-lg border bg-card focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        {shipments.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No shipments found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  Shipment
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  State
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Route
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  ETA
                </th>

              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => {
                const isDelivered = shipment.state.includes('delivered');
                const isDelayed = shipment.state.includes('delayed');
                const state = isDelayed
                  ? 'delayed'
                  : isDelivered
                    ? 'delivered'
                    : 'inTransit';

                const statusClasses = isDelivered
                  ? 'bg-green-500/10 text-foreground border border-green-500/20'
                  : isDelayed
                    ? 'bg-red-500/10 text-foreground border border-red-500/20'
                    : 'bg-accent/10 text-muted-foreground border border-accent/20';

                return (
                  <tr
                    key={shipment.id}
                    className="border-t border-border/60 hover:bg-muted/50"
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 text-left align-top font-normal"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          Shipment {shipment.id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {shipment.origin.city}, {shipment.origin.country} →{' '}
                          {shipment.destination.city},{' '}
                          {shipment.destination.country}
                        </span>
                        <ShipmentActionButtons
                          shipmentId={shipment.id}
                          actionsDisabled={actionsDisabled}
                          onViewDetails={onViewDetails}
                          onUpdateDelivery={onUpdateDelivery}
                        />
                      </div>
                    </th>
                    <td className="px-4 py-3 align-top">
                      <div
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses}`}
                      >
                        {state}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span>
                          From: {shipment.origin.city},{' '}
                          {shipment.origin.country}
                        </span>
                        <span>
                          To: {shipment.destination.city},{' '}
                          {shipment.destination.country}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-sm">
                      <span className="text-foreground">
                        {formatEta(shipment.estimatedDeliveryDate)}
                      </span>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const shipmentEtaFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

const formatEta = (isoString: string) => {
  if (!isoString) return 'N/A';

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  return shipmentEtaFormatter.format(date);
};
