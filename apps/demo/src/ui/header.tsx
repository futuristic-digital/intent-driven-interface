'use client';

import type { Ref } from 'react';
import { Menu, Truck } from 'lucide-react';

import { Button } from '@/ui/button';

/** Keeps navigation available whether the pinned-components panel is open or closed. */
export function ChatHeader({
  sidebarId,
  toggleRef,
  isSidebarOpen,
  onToggleSidebar,
}: {
  sidebarId: string;
  toggleRef: Ref<HTMLButtonElement>;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {

  return (
    <header className="relative z-30 flex shrink-0 items-center border-b border-border/50 bg-card/50 px-4 py-3 backdrop-blur-sm font-mono">
      <div className="flex items-center gap-3">
        {/* Menu */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          ref={toggleRef}
          aria-controls={sidebarId}
          aria-expanded={isSidebarOpen}
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">
            {isSidebarOpen ? 'Close workspace' : 'Open workspace'}
          </span>
        </Button>

        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/30">
              <Truck className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-foreground">
              Flowdock
            </h1>
            <p className="text-xs text-muted-foreground">
              Where shipments become systems
            </p>
          </div>
        </div>
      </div>

    </header>
  );
}
