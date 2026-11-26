import { useCallback, useRef } from 'react';
import { Check, Pin } from 'lucide-react';
import type {
  OpenComponent,
  ComponentRenderUIPart,
} from '@intent-driven-interface/frontend';
import type { componentMap } from '../../components/idi/component-map';
import {
  getDemoPinId,
  type PinDemoComponent,
} from '../../components/idi/pinned-component';
import { ChatMessageTimestamp } from './chat-message-timestamp';
import { Button } from '../button';

type DemoComponentPart = ComponentRenderUIPart<typeof componentMap>;

/** Closed tools render summaries; eligible components reopen with their latest input. */
export function RenderComponent({
  timestamp,
  renderComponentPart,
  openComponent,
  pinComponent,
  pinnedIds,
  disabled,
}: {
  timestamp: string;
  renderComponentPart: DemoComponentPart;
  openComponent: OpenComponent<typeof componentMap>;
  pinComponent: PinDemoComponent;
  pinnedIds: ReadonlySet<string>;
  disabled: boolean;
}) {
  const {
    componentId,
    toolState,
    isLive,
    componentProps,
    componentInput,
    componentOutput,
  } = renderComponentPart;
  const actionHadFocus = useRef(false);
  const summaryButtonRef = useCallback((button: HTMLButtonElement | null) => {
    if (
      button &&
      actionHadFocus.current &&
      document.activeElement === document.body
    ) {
      button.focus();
    }
  }, []);

  if (toolState === 'input-streaming') return null;

  const Component = renderComponentPart.component;
  const Summary = renderComponentPart.componentSummary;
  const OutputSummary = renderComponentPart.outputSummary;
  const output =
    !isLive && componentOutput !== undefined
      ? renderComponentPart.outputSchema?.safeParse(componentOutput)
      : undefined;
  const summaryProps = {
    componentInput,
    componentOutput: output?.success ? output.data : undefined,
  };

  // @ts-expect-error IDI validates this summary's input; the heterogeneous render type erases the correlation.
  const summary = <Summary {...summaryProps} />;
  const canOpenStandalone = !renderComponentPart.disableStandaloneOpen;
  const hasPinned =
    canOpenStandalone &&
    pinnedIds.has(getDemoPinId(componentId, componentInput));
  const pinLabel = hasPinned ? 'Pinned' : 'Pin';

  return (
    <div className="space-y-2 wrap-anywhere">
      <div className="flex min-h-8 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">
          <ChatMessageTimestamp timestamp={timestamp} />
        </span>
        {canOpenStandalone && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => pinComponent(componentId, componentInput)}
              aria-label={`${pinLabel}: ${renderComponentPart.title ?? componentId}`}
            >
              {hasPinned ? (
                <Check aria-hidden="true" />
              ) : (
                <Pin aria-hidden="true" />
              )}
              {pinLabel}
            </Button>
            <span role="status" className="sr-only">
              {hasPinned ? 'Component pinned.' : ''}
            </span>
          </>
        )}
      </div>
      {!isLive ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          {canOpenStandalone ? (
            <button
              ref={summaryButtonRef}
              type="button"
              aria-disabled={disabled}
              onClick={() => {
                if (!disabled) openComponent(componentId, componentInput);
              }}
              className="rounded-sm text-left text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:opacity-50 motion-reduce:transition-none"
            >
              <span className="sr-only">Open again: </span>
              {summary}
              <span aria-hidden="true" className="ml-2 text-xs text-primary">
                Open again
              </span>
            </button>
          ) : (
            summary
          )}
          {OutputSummary && output?.success && output.data !== undefined && (
            <div className="mt-2 text-muted-foreground">
              {/* @ts-expect-error This output was narrowed by the same registration's output schema. */}
              <OutputSummary {...output.data} />
            </div>
          )}
        </div>
      ) : (
        <div
          onFocusCapture={() => {
            actionHadFocus.current = true;
          }}
          onBlurCapture={(event) => {
            // A removed control may blur without a destination. Preserve focus only
            // if the user has not moved it elsewhere by the time the summary mounts.
            if (
              event.relatedTarget &&
              !event.currentTarget.contains(event.relatedTarget)
            ) {
              actionHadFocus.current = false;
            }
          }}
        >
          {/* @ts-expect-error IDI binds these validated lifecycle props to this component; the public render boundary erases their correlation. */}
          <Component {...componentProps} />
        </div>
      )}
    </div>
  );
}
