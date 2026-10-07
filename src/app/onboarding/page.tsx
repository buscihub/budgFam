import { redirect } from 'next/navigation';
import { getMembership } from '@/data/households';
import { OnboardingForm } from './onboarding-form';

export const metadata = { title: 'Crea la famiglia · budgFam' };

export default async function OnboardingPage() {
  // Already in a household: nothing to do here.
  if (await getMembership()) redirect('/');

  return (
    <main className="auth-page">
      <h1>Crea la tua famiglia</h1>
      <p>
        Sarai l’amministratore principale. Gli altri familiari potranno entrare con un tuo invito.
      </p>
      <OnboardingForm />
    </main>
  );
}
