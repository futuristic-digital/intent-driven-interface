import { defineComponentMap } from '@intent-driven-interface/frontend';
import { showShipments, selectShipment } from './shipments';
import { signOut } from './sign-out';
import { selectDeliverySlot } from './select-delivery-slot';
import { compareCarriers } from './compare-carriers';
import { updateShipment } from './update-shipment';

export const componentMap = defineComponentMap({
  showShipments,
  selectShipment,
  updateShipment,
  signOut,
  selectDeliverySlot,
  compareCarriers,
});
