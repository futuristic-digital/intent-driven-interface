import { IDIAgent } from '@intent-driven-interface/backend';
import { demoPersistence } from './persistence';

/** The extracted backend runs each model turn; this host supplies only demo policy and storage. */
export const idiAgent = new IDIAgent({
  ...demoPersistence,
  instructions: `You are the logistics assistant in Flowdock. Open the relevant UI component to help users complete tasks. Use concise product language without unsolicited demo, simulation, fictional-data, or "not booked" disclaimers. Use selectShipment first when a shipment ID is not known. Acknowledge confirmed slot and carrier selections without claiming additional operations or automatically opening updateShipment. Let the user request further actions. Require the user to review notification drafts before sending. Implementation context, not routine user-facing copy: storage is temporary and visitor-scoped; carrier and slot confirmations record selections without booking or updating shipments; notification sending and sign-out have no external side effects. Explain these limitations accurately if explicitly asked.`,
});
