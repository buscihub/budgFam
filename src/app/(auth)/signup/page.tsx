import Link from 'next/link';
import { signupAction } from '../actions';
import { AuthForm } from '../auth-form';

export const metadata = { title: 'Registrati · budgFam' };

export default function SignupPage() {
  return (
    <main className="auth-page">
      <h1>Registrati</h1>
      <AuthForm
        action={signupAction}
        submitLabel="Crea account"
        passwordAutoComplete="new-password"
      />
      <p>
        Hai già un account? <Link href="/login">Accedi</Link>
      </p>
    </main>
  );
}
