import { schema } from '@intent-driven-interface/frontend';

// Demo contacts are intentionally independent of shipment data.
export const recipientIdSchema = schema.enum(['alex', 'sam']);
export const recipients: Record<
  schema.infer<typeof recipientIdSchema>,
  { name: string; email: string; sms: string }
> = {
  alex: {
    name: 'Alex Morgan',
    email: 'alex@example.com',
    sms: '+1 202-555-0101',
  },
  sam: { name: 'Sam Taylor', email: 'sam@example.com', sms: '+1 202-555-0102' },
};
export const channelSchema = schema.enum(['email', 'sms']);
export const channelLabels = { email: 'Email', sms: 'SMS' };

/** Editable inputs retain the email subject when the user switches to SMS. */
export const inputSchema = schema.object({
  shipmentId: schema
    .string()
    .min(1)
    .describe(
      'Existing shipment ID from the user or selectShipment; never invent one.'
    ),
  recipientId: recipientIdSchema
    .nullable()
    .describe(
      'Available recipient: alex (Alex Morgan) or sam (Sam Taylor). Use null unless the user explicitly chose one; do not infer a recipient from the shipment.'
    ),
  channel: channelSchema.describe(
    'Requested channel: email or sms. Default to email when unspecified; the user can change it.'
  ),
  subject: schema
    .string()
    .describe(
      'AI-prepared email subject describing the delivery delay. Keep editable; retained but not sent for SMS.'
    ),
  message: schema
    .string()
    .describe(
      'AI-prepared, concise and empathetic delay message. Use a neutral greeting suitable for either recipient. Include only facts known from the conversation; omit unknown reasons and dates. Do not promise compensation or other unapproved actions.'
    ),
});

// The final snapshot contains only content relevant to the reviewed channel.
const messageSchema = schema.object({
  recipientName: schema.string(),
  destination: schema.string(),
  message: schema.string().trim().min(1),
});
export const notificationSchema = schema.discriminatedUnion('channel', [
  messageSchema.extend({
    channel: schema.literal('email'),
    subject: schema.string().trim().min(1),
  }),
  messageSchema.extend({ channel: schema.literal('sms') }),
]);
export const outputSchema = schema.discriminatedUnion('status', [
  schema.object({
    status: schema.literal('simulated'),
    shipmentId: schema.string(),
    notification: notificationSchema,
  }),
  schema.object({
    status: schema.literal('cancelled'),
    shipmentId: schema.string(),
  }),
]);
