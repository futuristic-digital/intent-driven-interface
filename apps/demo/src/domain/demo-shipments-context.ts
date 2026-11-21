import { createContext, useContext } from 'react';
import type { Shipment } from './shipment';

export type ShipmentEdit = Partial<
  Pick<
    Shipment,
    | 'state'
    | 'carrier'
    | 'estimatedDeliveryDate'
    | 'delayReason'
    | 'actualPosition'
  >
>;

type DemoShipments = {
  shipments: Shipment[];
  updateShipment: (id: string, edit: ShipmentEdit) => void;
};

export const DemoShipmentsContext = createContext<DemoShipments | null>(null);

export function useDemoShipments() {
  const demoShipments = useContext(DemoShipmentsContext);
  if (!demoShipments) throw new Error('DemoShipmentsProvider is missing');
  return demoShipments;
}
