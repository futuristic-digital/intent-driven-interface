'use client';

import { useState, type ReactNode } from 'react';
import {
  DemoShipmentsContext,
  type ShipmentEdit,
} from './demo-shipments-context';
import type { Shipment } from './shipment';
import { SHIPMENTS } from './shipment-seed';

export function DemoShipmentsProvider({ children }: { children: ReactNode }) {
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    const timestamp = new Date().toISOString();
    return SHIPMENTS.map((shipment) => ({
      ...shipment,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
  });

  function updateShipment(id: string, edit: ShipmentEdit) {
    const updatedAt = new Date().toISOString();
    setShipments((current) =>
      current.map((shipment) =>
        shipment.id === id ? { ...shipment, ...edit, updatedAt } : shipment
      )
    );
  }

  return (
    <DemoShipmentsContext value={{ shipments, updateShipment }}>
      {children}
    </DemoShipmentsContext>
  );
}
