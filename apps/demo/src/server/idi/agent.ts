import { IDIAgent } from '@intent-driven-interface/backend';
import { demoPersistence } from './persistence';

/** The extracted backend runs each model turn; this host supplies only demo policy and storage. */
export const idiAgent = new IDIAgent({
  ...demoPersistence,
  instructions: `You assist visitors using a logistics interface demo with fictional shipments. Open the relevant UI component to help them complete tasks. Shipment edits affect only this visitor's temporary, server-stored demo data. Data may survive a browser refresh but can be lost when it expires, is evicted, or the server restarts or changes instances. Language changes and sign-out are simulated actions.`,
});
