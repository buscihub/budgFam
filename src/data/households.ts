import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { requireUser, type CurrentUser } from './auth';
import { createClient } from './supabase/server';

export type Membership = {
  user: CurrentUser;
  householdId: string;
  householdName: string;
  displayName: string;
  role: 'admin' | 'member';
};

export type CreateHouseholdResult = { ok: true } | { ok: false; code: 'already_exists' | 'failed' };

// The signed-in user's membership, or null if they have no household yet.
// RLS only returns the caller's own household, so no extra filtering is needed.
export const getMembership = cache(async (): Promise<Membership | null> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('members')
    .select('household_id, display_name, role, households(name)')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data?.households) return null;

  return {
    user,
    householdId: data.household_id,
    householdName: data.households.name,
    displayName: data.display_name,
    role: data.role === 'admin' ? 'admin' : 'member',
  };
});

// Pages of the app call this: signed in AND member of a household, otherwise
// the user is sent to the step they are missing.
export async function requireMembership(): Promise<Membership> {
  const membership = await getMembership();
  if (!membership) redirect('/onboarding');
  return membership;
}

export async function createHousehold(
  householdName: string,
  memberName: string,
): Promise<CreateHouseholdResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_household', {
    household_name: householdName,
    member_name: memberName,
  });
  if (!error) return { ok: true };
  return {
    ok: false,
    code: error.message === 'household_already_exists' ? 'already_exists' : 'failed',
  };
}
