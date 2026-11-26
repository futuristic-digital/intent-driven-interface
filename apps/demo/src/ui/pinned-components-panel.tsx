import type { OpenComponent } from '@intent-driven-interface/frontend';
import { Pin } from 'lucide-react';
import type { Ref } from 'react';
import { componentMap } from '../components/idi/component-map';
import type { DemoPinnedComponent } from '../components/idi/pinned-component';
import { cn } from '../utils/cn';
import { Button } from './button';


/** Pins keep their own invocation inputs, rather than linking to an old message. */
export function PinnedComponentsPanel({
  id,
  panelRef,
  pinnedComponents,
  openComponent,
  disabled,
  isOpen,
  isOpenOnDesktop,
  isOpenOnMobile,
  onClose,
}: {
  id: string;
  panelRef: Ref<HTMLElement>;
  pinnedComponents: DemoPinnedComponent[];
  openComponent: OpenComponent<typeof componentMap>;
  disabled: boolean;
  isOpen: boolean;
  isOpenOnDesktop: boolean;
  isOpenOnMobile: boolean;
  onClose: () => void;
}) {
  const availablePins = pinnedComponents.filter(
    (pin) => !componentMap[pin.componentId].disableStandaloneOpen
  );

  return (
    <>
      <button
        type="button"
        aria-label="Close workspace"
        tabIndex={-1}
        aria-hidden="true"
        disabled={!isOpenOnMobile}
        onClick={onClose}
        className={cn(
          'absolute inset-0 z-10 bg-foreground/20 transition-opacity duration-300 motion-reduce:transition-none lg:hidden',
          isOpenOnMobile ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        id={id}
        ref={panelRef}
        aria-label="Workspace"
        inert={!isOpen}
        className={cn(
          'absolute inset-y-0 left-0 z-20 max-w-full overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:relative lg:shrink-0',
          isOpenOnMobile ? 'w-72' : 'w-0',
          isOpenOnDesktop ? 'lg:w-72' : 'lg:w-0'
        )}
      >
        <div className="h-full w-72 max-w-dvw overflow-y-auto border-r border-sidebar-border p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pin
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 className="text-sm font-semibold">Pinned components</h2>
            </div>
            {availablePins.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Pin a component next to its timestamp to reopen it here with the
                same inputs.
              </p>
            ) : (
              <nav aria-label="Pinned components" className="space-y-2 p-1">
                {availablePins.map((pin) => (
                  <PinnedComponentItem
                    key={pin.id}
                    pin={pin}
                    disabled={disabled}
                    openComponent={openComponent}
                    onOpen={onClose}
                  />
                ))}
              </nav>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function PinnedComponentItem({
  pin,
  disabled,
  openComponent,
  onOpen,
}: {
  pin: DemoPinnedComponent;
  disabled: boolean;
  openComponent: OpenComponent<typeof componentMap>;
  onOpen: () => void;
}) {
  const { componentId, componentInput } = pin;
  const component = componentMap[componentId];
  const savedInput = component.inputSchema.safeParse(componentInput);
  if (!savedInput.success) return null;
  const Summary = component.componentSummary;
  const summaryProps = { componentInput: savedInput.data };

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      title="Reopen with saved inputs"
      className="h-auto min-h-11 w-full justify-start whitespace-normal wrap-anywhere border border-sidebar-border px-3 py-3 text-left motion-reduce:transition-none"
      onClick={() => {
        openComponent(componentId, savedInput.data);
        onOpen();
      }}
    >
      {/* @ts-expect-error The registration's schema validates the input; the union summary loses that correlation. */}
      <Summary {...summaryProps} />
    </Button>
  );
}
