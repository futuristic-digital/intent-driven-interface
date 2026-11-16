import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { X, LogOut } from 'lucide-react';

export const signOut = defineIDIComponent({
  description:
    'Show a sign-out confirmation with Sign Out and Cancel buttons. Return whether the user confirmed or cancelled.',
  inputSchema: schema.object({}),
  outputSchema: schema.object({ signedOut: schema.boolean() }),
  component: function SignOut({ closeComponent }) {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() =>
            void closeComponent({ setComponentOutput: { signedOut: false } })
          }
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            void closeComponent({ setComponentOutput: { signedOut: true } })
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    );
  },
  componentSummary: function SignOutSummary() {
    return <span>Sign out</span>;
  },
  outputSummary: function SignOutResult({ signedOut }) {
    return <span>{signedOut ? 'Signed out' : 'Cancelled'}</span>;
  },
});
