import { redirect } from 'next/navigation';
import { getMembership } from '@/data/households';
import { AcceptInviteForm } from './accept-invite-form';

export const metadata = { title: 'Unisciti alla famiglia · budgFam' };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  // Already in a household (including a stale link clicked twice): nothing to do.
  if (await getMembership()) redirect('/');

  const { code } = await params;
  return (
    <main className="auth-page">
      <h1>Unisciti alla famiglia</h1>
      <AcceptInviteForm code={code} />
    </main>
  );
}
