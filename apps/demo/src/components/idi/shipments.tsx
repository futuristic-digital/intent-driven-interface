import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { Shipments } from '../shipments';

const shipmentSchema = schema.object({
  displayType: schema
    .enum(['map', 'list'])
    .describe('Use map unless the user asks for a list or table.'),
  filter: schema
    .enum(['inTransit', 'delayed', 'delivered'])
    .describe(
      'Shipment status to display. Use inTransit when no status is requested.'
    ),
});

export const showShipments = defineIDIComponent({
  description:
    'Show fictional shipments on a map or in a list, filtered by status. The view is read-only and includes routes and estimated delivery times. Use selectShipment when the user needs to choose a shipment for editing.',
  inputSchema: shipmentSchema,
  component: function ShowShipments({ componentInput }) {
    return <Shipments {...componentInput} />;
  },
  componentSummary: function ShipmentsSummary({ componentInput }) {
    return (
      <span>
        Shipments · {componentInput.filter} · {componentInput.displayType}
      </span>
    );
  },
});

export const selectShipment = defineIDIComponent({
  description:
    'Open a shipment map or list with Select controls. The user chooses one shipment and returns its ID for a subsequent action such as editing; selection does not change shipment data.',
  inputSchema: shipmentSchema,
  outputSchema: schema.object({ selectedShipmentId: schema.string() }),
  component: function SelectShipment({ componentInput, closeComponent }) {
    return (
      <Shipments
        {...componentInput}
        onSelect={(shipment) =>
          void closeComponent({
            setComponentOutput: { selectedShipmentId: shipment.id },
          })
        }
      />
    );
  },
  componentSummary: function SelectionSummary({ componentInput }) {
    return (
      <span>
        Select shipment · {componentInput.filter} · {componentInput.displayType}
      </span>
    );
  },
  outputSummary: function SelectedShipment({ selectedShipmentId }) {
    return <span>Selected {selectedShipmentId}</span>;
  },
});
