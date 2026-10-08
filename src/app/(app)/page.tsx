import { requireMembership } from '@/data/households';
import { logoutAction } from './actions';
import { InviteForm } from './invite-form';

export default async function HomePage() {
  // The proxy already filtered logged-out visitors; this is the check that
  // counts: signed in and member of a household, else sent to /onboarding.
  const { user, householdName, displayName, role } = await requireMembership();

  return (
    <main className="auth-page">
      <h1>budgFam</h1>
      <p>
        Ciao, {displayName} — {householdName}
      </p>
      <p>{user.email}</p>
      <form action={logoutAction}>
        <button type="submit">Esci</button>
      </form>

      {role === 'admin' && (
        <>
          <h2>Invita un familiare</h2>
          <InviteForm />
        </>
      )}
    </main>
  );
}
