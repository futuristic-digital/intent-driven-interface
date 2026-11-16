'use client';

import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';

import {
  channelLabels,
  channelSchema,
  inputSchema,
  notificationSchema,
  outputSchema,
  recipientIdSchema,
  recipients,
} from './delay-notification-contracts';
const fieldClassName =
  'min-h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none';

/** Prepare a draft, require human review, and return a simulated outcome only. */
export const composeDelayNotification = defineIDIComponent({
  description:
    'Compose a delivery-delay notification for human review. Use selectShipment first if the shipment ID is unknown. Prepare editable subject and message text using only known facts; never invent a delay reason, delivery estimate, or promise. The user chooses a recipient and Email or SMS, edits the draft, then opens a final preview before choosing Send notification or cancelling. Use concise product-facing language without demo or simulation disclaimers. The send action records the reviewed notification without calling a delivery provider or changing the shipment.',
  inputSchema,
  outputSchema,
  component: function ComposeDelayNotification({
    componentInput,
    setComponentInputState,
    closeComponent,
  }) {
    const id = useId();
    const [preview, setPreview] = useState<schema.infer<
      typeof notificationSchema
    > | null>(null);
    const [busy, setBusy] = useState<'simulated' | 'cancelled' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const finishing = useRef(false);
    const recipient =
      componentInput.recipientId === null
        ? null
        : recipients[componentInput.recipientId];
    const canPreview =
      recipient !== null &&
      componentInput.message.trim().length > 0 &&
      (componentInput.channel === 'sms' ||
        componentInput.subject.trim().length > 0);

    // Persist draft changes, but never persist approval: reopening always requires review.
    function updateDraft(changes: Partial<typeof componentInput>) {
      setError(null);
      setPreview(null);
      setComponentInputState((previous) => ({ ...previous, ...changes }));
    }

    async function finish(output: schema.infer<typeof outputSchema>) {
      if (finishing.current) return;
      finishing.current = true;
      setBusy(output.status);
      setError(null);
      try {
        await closeComponent({
          setComponentOutput: output,
          agentFollowUp: false,
        });
      } catch {
        setError('Could not complete this action. Please try again.');
      } finally {
        finishing.current = false;
        setBusy(null);
      }
    }

    return (
      <section
        aria-label="Compose delay notification"
        aria-busy={busy !== null}
        className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground"
      >
        <header className="space-y-1">
          <h3 className="font-semibold">Delay notification</h3>
          <p className="wrap-break-word text-sm text-muted-foreground">
            Shipment {componentInput.shipmentId}
          </p>
          <p className="text-xs text-muted-foreground">
            AI-prepared draft · Review and personalize before sending.
          </p>
        </header>

        {preview === null ? (
          <form
            key="edit"
            className="space-y-4 transition-opacity duration-150 starting:opacity-0 motion-reduce:transition-none"
            onSubmit={(event) => {
              event.preventDefault();
              if (!recipient || !canPreview) return;
              const message = {
                recipientName: recipient.name,
                destination: recipient[componentInput.channel],
                message: componentInput.message.trim(),
              };
              setError(null);
              setPreview(
                componentInput.channel === 'email'
                  ? {
                      ...message,
                      channel: 'email',
                      subject: componentInput.subject.trim(),
                    }
                  : { ...message, channel: 'sms' }
              );
            }}
          >
            <fieldset disabled={busy !== null} className="min-w-0 space-y-4">
              <legend className="sr-only">Edit notification draft</legend>
              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-recipient`}
                  className="block text-sm font-medium"
                >
                  Recipient
                </label>
                <select
                  id={`${id}-recipient`}
                  required
                  value={componentInput.recipientId ?? ''}
                  aria-describedby={`${id}-recipient-help`}
                  className={fieldClassName}
                  onChange={(event) => {
                    const parsed = recipientIdSchema.safeParse(
                      event.currentTarget.value
                    );
                    updateDraft({
                      recipientId: parsed.success ? parsed.data : null,
                    });
                  }}
                >
                  <option value="">Choose a recipient</option>
                  {recipientIdSchema.options.map((recipientId) => (
                    <option key={recipientId} value={recipientId}>
                      {recipients[recipientId].name}
                    </option>
                  ))}
                </select>
                <p
                  id={`${id}-recipient-help`}
                  className="wrap-break-word text-xs text-muted-foreground"
                >
                  {recipient
                    ? recipient[componentInput.channel]
                    : 'Select the customer you want to notify.'}
                </p>
              </div>

              <fieldset className="min-w-0">
                <legend className="mb-2 text-sm font-medium">Channel</legend>
                <div className="grid grid-cols-2 gap-2">
                  {channelSchema.options.map((channel) => (
                    <label
                      key={channel}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none ${componentInput.channel === channel ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                    >
                      <input
                        type="radio"
                        name={`${id}-channel`}
                        value={channel}
                        checked={componentInput.channel === channel}
                        onChange={() => updateDraft({ channel })}
                        className="size-4 accent-primary"
                      />
                      {channelLabels[channel]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-subject`}
                  className="block text-sm font-medium"
                >
                  Subject{' '}
                  {componentInput.channel === 'sms' && (
                    <span className="font-normal text-muted-foreground">
                      (email only)
                    </span>
                  )}
                </label>
                <input
                  id={`${id}-subject`}
                  type="text"
                  value={componentInput.subject}
                  disabled={componentInput.channel === 'sms'}
                  required={componentInput.channel === 'email'}
                  onChange={(event) =>
                    updateDraft({ subject: event.currentTarget.value })
                  }
                  className={`${fieldClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-message`}
                  className="block text-sm font-medium"
                >
                  Message
                </label>
                <textarea
                  id={`${id}-message`}
                  required
                  rows={6}
                  value={componentInput.message}
                  aria-describedby={`${id}-message-help`}
                  onChange={(event) =>
                    updateDraft({ message: event.currentTarget.value })
                  }
                  className={`${fieldClassName} resize-y`}
                />
                <p
                  id={`${id}-message-help`}
                  className="text-xs text-muted-foreground"
                >
                  Check the wording and delivery details before previewing. You
                  can edit every part of this draft.
                </p>
              </div>
            </fieldset>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={busy !== null || !canPreview}
                className="motion-reduce:transition-none"
              >
                Preview notification
              </Button>
            </div>
          </form>
        ) : (
          <div
            key="preview"
            className="space-y-4 transition-opacity duration-150 starting:opacity-0 motion-reduce:transition-none"
          >
            <section
              aria-label="Final notification preview"
              className="space-y-3 rounded-lg border border-border bg-background p-4"
            >
              <h4
                tabIndex={-1}
                ref={(element) => element?.focus()}
                className="text-sm font-semibold focus-visible:outline-none"
              >
                Final preview · {channelLabels[preview.channel]}
              </h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">To</dt>
                  <dd className="wrap-break-word">
                    {preview.recipientName} · {preview.destination}
                  </dd>
                </div>
                {preview.channel === 'email' && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Subject</dt>
                    <dd className="wrap-break-word font-medium">
                      {preview.subject}
                    </dd>
                  </div>
                )}
              </dl>
              <p className="whitespace-pre-wrap wrap-break-word border-t border-border pt-3 text-sm leading-relaxed">
                {preview.message}
              </p>
            </section>
            <p className="text-xs text-muted-foreground">
              Review the recipient and message before sending.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                className="motion-reduce:transition-none"
                onClick={() => {
                  setPreview(null);
                  setError(null);
                }}
              >
                Back to editing
              </Button>
              <Button
                type="button"
                disabled={busy !== null}
                className="motion-reduce:transition-none"
                onClick={() =>
                  void finish({
                    status: 'simulated',
                    shipmentId: componentInput.shipmentId,
                    notification: preview,
                  })
                }
              >
                {busy === 'simulated' && (
                  <Loader2
                    aria-hidden="true"
                    className="size-4 motion-safe:animate-spin"
                  />
                )}
                {busy === 'simulated' ? 'Sending…' : 'Send notification'}
              </Button>
            </div>
          </div>
        )}

        <footer className="space-y-2 border-t border-border pt-3">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled={busy !== null}
            className="motion-reduce:transition-none"
            onClick={() =>
              void finish({
                status: 'cancelled',
                shipmentId: componentInput.shipmentId,
              })
            }
          >
            {busy === 'cancelled' && (
              <Loader2
                aria-hidden="true"
                className="size-4 motion-safe:animate-spin"
              />
            )}
            {busy === 'cancelled' ? 'Cancelling…' : 'Cancel notification'}
          </Button>
        </footer>
      </section>
    );
  },
  componentSummary: function DelayNotificationSummary({ componentInput }) {
    return (
      <span>
        Delay notification · {componentInput.shipmentId} ·{' '}
        {channelLabels[componentInput.channel]}
        {componentInput.recipientId
          ? ` · ${recipients[componentInput.recipientId].name}`
          : ' · No recipient selected'}
      </span>
    );
  },
  outputSummary: function DelayNotificationResult(output) {
    return (
      <span>
        {output.status === 'cancelled'
          ? 'Delay notification cancelled'
          : `${channelLabels[output.notification.channel]} sent to ${output.notification.recipientName}`}
      </span>
    );
  },
});
