import { requireUser } from '@/data/auth';
import { logoutAction } from './actions';

export default async function HomePage() {
  // The proxy already filtered logged-out visitors; this is the check that counts.
  const user = await requireUser();

  return (
    <main className="auth-page">
      <h1>budgFam</h1>
      <p>Ciao, {user.email}</p>
      <form action={logoutAction}>
        <button type="submit">Esci</button>
      </form>
    </main>
  );
}
