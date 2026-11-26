import { defineComponentMap } from '@intent-driven-interface/frontend';
import { showShipments } from './shipments';
import { shipmentDetails } from './shipment-details';
import { signOut } from './sign-out';
import { selectDeliverySlot } from './select-delivery-slot';
import { compareCarriers } from './compare-carriers';
import { composeDelayNotification } from './compose-delay-notification';
import { updateShipment } from './update-shipment';

export const componentMap = defineComponentMap({
  showShipments,
  shipmentDetails,
  updateShipment,
  signOut,
  selectDeliverySlot,
  compareCarriers,
  composeDelayNotification,
});
