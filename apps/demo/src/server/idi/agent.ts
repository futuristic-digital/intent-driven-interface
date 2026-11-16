import { IDIAgent } from '@intent-driven-interface/backend';
import { demoPersistence } from './persistence';

/** The extracted backend runs each model turn; this host supplies only demo policy and storage. */
export const idiAgent = new IDIAgent({
  ...demoPersistence,
  instructions: `You assist visitors using a logistics interface demo with fictional shipments. Open the relevant UI component to help them complete tasks. Shipment edits affect only this visitor's temporary, server-stored demo data. Data may survive a browser refresh but can be lost when it expires, is evicted, or the server restarts or changes instances. Delivery-slot availability and carrier quotes are fictional. Use selectShipment first when a shipment ID is not known. Slot and carrier confirmations return choices to the conversation only: never claim they booked, rescheduled, or updated a shipment, and do not automatically open updateShipment after confirmation. Acknowledge the choice and let the visitor request a further action. Sign-out is simulated.`,
});
