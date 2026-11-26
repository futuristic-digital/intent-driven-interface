import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { useState } from 'react';
import {
  useDemoShipments,
  type ShipmentEdit,
} from '../../domain/demo-shipments-context';
import { shipmentIdInputSchema } from './shipment-input';
import { ShipmentPicker } from './shipment-picker';
import { UpdateShipmentForm } from './update-shipment-form';
import { useShipmentSelection } from './use-shipment-selection';

const outputSchema = schema.discriminatedUnion('status', [
  schema.object({
    status: schema.literal('confirmed'),
    shipmentId: schema.string(),
  }),
  schema.object({
    status: schema.literal('cancelled'),
    shipmentId: schema.string().nullable(),
  }),
]);

type UpdateOutcome = schema.infer<typeof outputSchema>;
type UpdateAction = UpdateOutcome &
  ({ status: 'confirmed'; edit: ShipmentEdit } | { status: 'cancelled' });

export const updateShipment = defineIDIComponent({
  title: 'Update delivery details',
  description:
    'Edit a demo shipment’s status, carrier, estimated delivery, delay reason, or current coordinates. The user chooses a shipment if needed, then reviews and confirms the update before any demo data changes.',
  disableAgentOpen: true,
  inputSchema: schema.object({ shipmentId: shipmentIdInputSchema }),
  outputSchema,
  componentSummary: function UpdateShipmentSummary({ componentInput }) {
    const { shipmentId } = componentInput;
    return (
      <span>Update delivery details{shipmentId ? ` · ${shipmentId}` : ''}</span>
    );
  },
  outputSummary: function UpdateShipmentResult({ status }) {
    return (
      <span>
        {status === 'confirmed'
          ? 'Delivery details updated'
          : 'Delivery update cancelled'}
      </span>
    );
  },
  component: function UpdateShipment({
    componentInput: { shipmentId },
    setComponentInput,
    closeComponent,
  }) {
    const { updateShipment: applyShipmentEdit } = useDemoShipments();
    const [pending, setPending] = useState<UpdateOutcome['status'] | null>(
      null
    );
    const [error, setError] = useState<string | null>(null);
    const { shipment, chooseShipment, headingRef } = useShipmentSelection(
      shipmentId,
      (shipmentId) => setComponentInput({ shipmentId })
    );

    async function finish(action: UpdateAction) {
      if (pending !== null) return;
      setPending(action.status);
      setError(null);
      try {
        const output: UpdateOutcome =
          action.status === 'confirmed'
            ? { status: 'confirmed', shipmentId: action.shipmentId }
            : action;
        await closeComponent({
          setComponentOutput: output,
          agentFollowUp: false,
        });
        // Leave the page-memory data untouched if saving the confirmed outcome fails.
        if (action.status === 'confirmed')
          applyShipmentEdit(action.shipmentId, action.edit);
      } catch {
        setError('Could not complete the delivery update. Please try again.');
      } finally {
        setPending(null);
      }
    }

    if (!shipment) {
      return (
        <ShipmentPicker
          title="Update delivery details"
          label="Choose a shipment to update"
          onSelect={chooseShipment}
          cancel={{
            label: 'Cancel',
            variant: 'outline',
            pending: pending === 'cancelled',
            error,
            onCancel: (selectedId) =>
              void finish({ status: 'cancelled', shipmentId: selectedId }),
          }}
        />
      );
    }

    return (
      <UpdateShipmentForm
        key={shipment.id}
        shipment={shipment}
        headingRef={headingRef}
        pending={pending}
        closeError={error}
        onConfirm={(edit) =>
          void finish({ status: 'confirmed', shipmentId: shipment.id, edit })
        }
        onCancel={() =>
          void finish({ status: 'cancelled', shipmentId: shipment.id })
        }
      />
    );
  },
});
