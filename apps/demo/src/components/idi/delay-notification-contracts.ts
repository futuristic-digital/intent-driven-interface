import { schema } from '@intent-driven-interface/frontend';
import { shipmentIdInputSchema } from './shipment-input';

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
export const maxNotificationSubjectLength = 180;
export const maxNotificationMessageLength = 1_200;

/** Editable inputs retain the email subject when the user switches to SMS. */
export const inputSchema = schema.object({
  shipmentId: shipmentIdInputSchema,
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
    .max(maxNotificationSubjectLength)
    .describe(
      'Editable email subject describing the delivery delay. Required as a string, but may start empty. For SMS, pass an empty string unless retaining an existing email subject; the SMS preview excludes it.'
    ),
  message: schema
    .string()
    .max(maxNotificationMessageLength)
    .describe(
      'Editable draft message; may start empty. When drafting, use a neutral greeting and only known facts. Omit unknown reasons and dates, and do not promise compensation or other unapproved actions.'
    ),
});

// The final snapshot contains only content relevant to the reviewed channel.
const messageSchema = schema.object({
  recipientName: schema.string(),
  destination: schema.string(),
  message: schema.string().trim().min(1).max(maxNotificationMessageLength),
});
export const notificationSchema = schema.discriminatedUnion('channel', [
  messageSchema.extend({
    channel: schema.literal('email'),
    subject: schema.string().trim().min(1).max(maxNotificationSubjectLength),
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
    shipmentId: schema.string().nullable(),
  }),
]);
