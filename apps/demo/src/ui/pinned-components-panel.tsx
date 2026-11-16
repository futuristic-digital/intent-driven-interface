import type { PinnedIDIComponent } from '@intent-driven-interface/backend/api-contracts';
import type { RestoreComponent } from '@intent-driven-interface/frontend';
import { Loader2, Pin } from 'lucide-react';
import { componentMap } from '../components/idi/component-map';
import { cn } from '../utils/cn';
import { Button } from './button';

/** Pins keep their own invocation inputs, rather than linking to an old message. */
export function PinnedComponentsPanel({
  pinnedComponents,
  restoreComponent,
  isLoading,
  disabled,
  isOpen,
  isOpenOnDesktop,
  isOpenOnMobile,
  onClose,
}: {
  pinnedComponents: PinnedIDIComponent[];
  restoreComponent: RestoreComponent<typeof componentMap>;
  isLoading: boolean;
  disabled: boolean;
  isOpen: boolean;
  isOpenOnDesktop: boolean;
  isOpenOnMobile: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close pinned components"
        tabIndex={-1}
        aria-hidden={!isOpenOnMobile}
        disabled={!isOpenOnMobile}
        onClick={onClose}
        className={cn(
          'absolute inset-0 z-10 bg-foreground/20 transition-opacity duration-300 motion-reduce:transition-none lg:hidden',
          isOpenOnMobile ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        id="pinned-components-panel"
        aria-label="Pinned components"
        inert={!isOpen}
        className={cn(
          'absolute inset-y-0 left-0 z-20 overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:relative lg:shrink-0',
          isOpenOnMobile ? 'w-72' : 'w-0',
          isOpenOnDesktop ? 'lg:w-72' : 'lg:w-0'
        )}
      >
        <div className="flex h-full w-72 flex-col gap-4 border-r border-sidebar-border p-4">
          <div className="flex items-center gap-2">
            <Pin className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Pinned components</h2>
          </div>
          {isLoading ? (
            <div
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2
                className="size-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
              Loading pins…
            </div>
          ) : pinnedComponents.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pin a component next to its timestamp to reopen it here with the
              same inputs.
            </p>
          ) : (
            <nav
              aria-label="Pinned components"
              className="min-h-0 flex-1 space-y-2 overflow-y-auto"
            >
              {pinnedComponents.map((pin) => (
                <PinnedComponentItem
                  key={pin.id}
                  pin={pin}
                  disabled={disabled}
                  restoreComponent={restoreComponent}
                  onOpen={onClose}
                />
              ))}
            </nav>
          )}
        </div>
      </aside>
    </>
  );
}

/** Stored pins cross a JSON boundary and can outlive a component registration. */
function isDemoComponentId(id: string): id is keyof typeof componentMap {
  return Object.hasOwn(componentMap, id);
}

/** Validate saved inputs before rendering a summary or restoring its invocation. */
function PinnedComponentItem({
  pin,
  disabled,
  restoreComponent,
  onOpen,
}: {
  pin: PinnedIDIComponent;
  disabled: boolean;
  restoreComponent: RestoreComponent<typeof componentMap>;
  onOpen: () => void;
}) {
  const { componentId } = pin;
  if (!isDemoComponentId(componentId)) return null;
  const component = componentMap[componentId];
  const input = component.inputSchema.safeParse(pin.componentInput);
  const state =
    pin.componentInputState === undefined
      ? undefined
      : component.inputSchema.safeParse(pin.componentInputState);
  if (!input.success || (state && !state.success)) return null;
  const snapshot = {
    componentInput: input.data,
    ...(state?.success ? { componentInputState: state.data } : {}),
  };
  const Summary = component.componentSummary;
  const summaryProps = {
    componentInput: snapshot.componentInputState ?? snapshot.componentInput,
  };

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      title="Reopen with saved inputs"
      className="h-auto min-h-11 w-full justify-start whitespace-normal border border-sidebar-border px-3 py-3 text-left motion-reduce:transition-none"
      onClick={() => {
        restoreComponent(componentId, snapshot);
        onOpen();
      }}
    >
      {/* @ts-expect-error The registration's schema validates the input; the union summary loses that correlation. */}
      <Summary {...summaryProps} />
    </Button>
  );
}
