/** Visitor-scoped fake shipment DB; data is lost on eviction or server restart. */
import type { Shipment, ShipmentState } from '../../domain/shipment';
import { createVisitorStore } from '../visitor-store';
import { SHIPMENTS } from './entities/shipments';

const getShipments = createVisitorStore(() => {
  const timestamp = new Date().toISOString();
  return new Map<string, Shipment>(
    SHIPMENTS.map((shipment) => [
      shipment.id,
      {
        ...structuredClone(shipment),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ])
  );
});

/** Only fixed seed records can be edited, so collection cardinality stays bounded. */
export function getDemoDatabase(visitorId: string) {
  const shipments = getShipments(visitorId);
  return {
    shipments: {
      getAll(state?: ShipmentState): Shipment[] {
        const list = Array.from(shipments.values());
        return state
          ? list.filter((shipment) => shipment.state.includes(state))
          : list;
      },
      getById(id: string): Shipment | undefined {
        return shipments.get(id);
      },
      update(
        id: string,
        patch: Partial<Omit<Shipment, 'id' | 'createdAt'>>
      ): Shipment | undefined {
        const existing = shipments.get(id);
        if (!existing) return undefined;
        const updated: Shipment = {
          ...existing,
          ...patch,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        };
        shipments.set(id, updated);
        return updated;
      },
    },
  };
}
