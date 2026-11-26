import { defineIDIComponent, schema } from '@intent-driven-interface/frontend';
import { useState } from 'react';
import { X, LogOut } from 'lucide-react';
import { Button } from '../../ui/button';

const actionTitle = 'Sign out';
const simulationNotice =
  'Sign-out is simulated. No account or session is changed.';
const signOutStatusSchema = schema.enum(['simulated', 'cancelled']);
type SignOutStatus = schema.infer<typeof signOutStatusSchema>;

export const signOut = defineIDIComponent({
  title: actionTitle,
  description:
    'Open a simulated sign-out confirmation when the user asks to sign out. The user can confirm the simulation or cancel. Neither choice signs anyone out or changes the session.',
  disableStandaloneOpen: true,
  inputSchema: schema.object({}),
  outputSchema: schema.object({ status: signOutStatusSchema }),
  component: function SignOut({ closeComponent }) {
    const [pending, setPending] = useState<SignOutStatus | null>(null);
    const [failed, setFailed] = useState(false);

    async function finish(status: SignOutStatus) {
      if (pending !== null) return;
      setPending(status);
      setFailed(false);
      try {
        await closeComponent({
          setComponentOutput: { status },
          agentFollowUp: false,
        });
      } catch {
        setFailed(true);
      } finally {
        setPending(null);
      }
    }

    return (
      <div>
        <p className="text-sm text-muted-foreground">{simulationNotice}</p>
        <p role="alert" className="text-sm text-destructive">
          {failed ? 'Could not complete this action. Please try again.' : ''}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending === 'simulated'}
            aria-disabled={pending === 'cancelled'}
            onClick={() => void finish('cancelled')}
          >
            <X className="size-3.5" aria-hidden="true" />
            {pending === 'cancelled' ? 'Cancelling…' : 'Cancel'}
          </Button>
          <Button
            type="button"
            disabled={pending === 'cancelled'}
            aria-disabled={pending === 'simulated'}
            onClick={() => void finish('simulated')}
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            {pending === 'simulated' ? 'Simulating sign-out…' : actionTitle}
          </Button>
        </div>
      </div>
    );
  },
  componentSummary: function SignOutSummary() {
    return <span>{actionTitle}</span>;
  },
  outputSummary: function SignOutResult({ status }) {
    return <span>{status === 'simulated' ? simulationNotice : 'Cancelled'}</span>;
  },
});
