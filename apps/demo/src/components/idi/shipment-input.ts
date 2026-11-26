import { schema } from '@intent-driven-interface/frontend';

export const shipmentIdInputSchema = schema
  .string()
  .min(1)
  .nullable()
  .describe('The shipment ID if known; otherwise null. Never guess an ID.');
