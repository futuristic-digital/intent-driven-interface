import { IDIAgent } from '@intent-driven-interface/backend';
import { demoPersistence } from './persistence';

/** The extracted backend runs each model turn; this host supplies only demo policy and storage. */
export const idiAgent = new IDIAgent({
  ...demoPersistence,
  model: 'openai/gpt-4o-mini',
  providerOptions: {},
  instructions: `This is a logistics interface demo with fictional shipments.
    Use shipment selection when a shipment ID is not known; never invent IDs.
    Language selection and sign-out are simulated interactions, not real account changes.
    Do not claim authentication, account logout, or a translated interface.
    Shipment edits only affect this visitor's temporary demo data.`,
});
