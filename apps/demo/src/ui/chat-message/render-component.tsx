import type {
  ComponentRenderUIPart,
  RestoreComponent,
} from '@intent-driven-interface/frontend';
import { componentMap } from '../../components/idi/component-map';
import { ChatMessageTimestamp } from './chat-message-timestamp';

type DemoComponentPart = ComponentRenderUIPart<typeof componentMap>;

/** Closed tools render summaries; reopening preserves original input and edited state. */
export function RenderComponent({
  timestamp,
  renderComponentPart,
  restoreComponent,
  disabled,
}: {
  timestamp: string;
  renderComponentPart: DemoComponentPart;
  restoreComponent: RestoreComponent<typeof componentMap>;
  disabled: boolean;
}) {
  const { componentId, toolState, isClosed, componentProps, inputSnapshot } =
    renderComponentPart;
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
    <div>
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
      <p className="mt-2 ml-5 text-[10px] font-mono text-muted-foreground">
        <ChatMessageTimestamp timestamp={timestamp} />
      </p>
    </div>
  );
}
