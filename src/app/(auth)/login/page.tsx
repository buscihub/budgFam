import Link from 'next/link';
import { loginAction } from '../actions';
import { AuthForm } from '../auth-form';

export const metadata = { title: 'Accedi · budgFam' };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <h1>Accedi</h1>
      <AuthForm action={loginAction} submitLabel="Accedi" passwordAutoComplete="current-password" />
      <p>
        Non hai un account? <Link href="/signup">Registrati</Link>
      </p>
    </main>
  );
}
