import { useState } from 'react';
import { Check, Loader2, Pin } from 'lucide-react';
import type { ComponentInputSnapshot } from '@intent-driven-interface/backend/api-contracts';
import type {
  ComponentRenderUIPart,
  RestoreComponent,
} from '@intent-driven-interface/frontend';
import { componentMap } from '../../components/idi/component-map';
import { ChatMessageTimestamp } from './chat-message-timestamp';
import { Button } from '../button';

type DemoComponentPart = ComponentRenderUIPart<typeof componentMap>;

/** Closed tools render summaries; reopening preserves original input and edited state. */
export function RenderComponent({
  timestamp,
  renderComponentPart,
  restoreComponent,
  pinComponent,
  disabled,
}: {
  timestamp: string;
  renderComponentPart: DemoComponentPart;
  restoreComponent: RestoreComponent<typeof componentMap>;
  pinComponent: (
    componentId: string,
    snapshot: ComponentInputSnapshot
  ) => Promise<void>;
  disabled: boolean;
}) {
  const [pinStatus, setPinStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const { componentId, toolState, isClosed, componentProps, inputSnapshot } =
    renderComponentPart;

  /** Capture original input and edited state without conflating either with output. */
  async function handlePin() {
    setPinStatus('loading');
    try {
      await pinComponent(componentId, inputSnapshot);
      setPinStatus('success');
    } catch {
      setPinStatus('error');
    }
  }
  if (toolState === 'input-streaming') return null;

  const Component = renderComponentPart.component;
  const Summary = renderComponentPart.componentSummary;
  const OutputSummary = renderComponentPart.outputSummary;
  const output = renderComponentPart.outputSchema?.safeParse(
    renderComponentPart.componentOutput
  );
  const summaryProps = {
    componentInput: componentProps.componentInput,
    componentOutput: output?.success ? output.data : undefined,
  };

  return (
    <div className="space-y-2">
      <div className="flex min-h-8 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">
          <ChatMessageTimestamp timestamp={timestamp} />
        </span>
        {!renderComponentPart.followUpComponent && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || pinStatus === 'loading'}
              onClick={() => void handlePin()}
              aria-label={`Pin ${renderComponentPart.title ?? componentId}`}
              aria-busy={pinStatus === 'loading'}
            >
              {pinStatus === 'loading' ? (
                <Loader2
                  aria-hidden="true"
                  className="motion-safe:animate-spin"
                />
              ) : pinStatus === 'success' ? (
                <Check aria-hidden="true" />
              ) : (
                <Pin aria-hidden="true" />
              )}
              {pinStatus === 'loading'
                ? 'Pinning…'
                : pinStatus === 'success'
                  ? 'Pinned'
                  : pinStatus === 'error'
                    ? 'Retry pin'
                    : 'Pin'}
            </Button>
            <span
              role="status"
              className={pinStatus === 'error' ? 'text-destructive' : 'sr-only'}
            >
              {pinStatus === 'error'
                ? 'Could not pin component. Try again.'
                : pinStatus === 'success'
                  ? 'Component pinned.'
                  : pinStatus === 'loading'
                    ? 'Pinning component…'
                    : ''}
            </span>
          </>
        )}
      </div>
      {isClosed ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <button
            type="button"
            disabled={disabled}
            onClick={() => restoreComponent(componentId, inputSnapshot)}
            className="rounded-sm text-left text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Reopen ${renderComponentPart.title ?? componentId}`}
          >
            {/* @ts-expect-error IDI validates this summary's input; the heterogeneous render type erases the correlation. */}
            <Summary {...summaryProps} />
          </button>
          {OutputSummary && output?.success && output.data !== undefined && (
            <div className="mt-2 text-muted-foreground">
              {/* @ts-expect-error This output was narrowed by the same registration's output schema. */}
              <OutputSummary {...output.data} />
            </div>
          )}
        </div>
      ) : (
        // @ts-expect-error IDI binds these validated lifecycle props to this component; the public render boundary erases their correlation.
        <Component {...componentProps} />
      )}
    </div>
  );
}
