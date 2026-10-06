'use server';

import { redirect } from 'next/navigation';
import { signOut } from '@/data/auth';

export async function logoutAction() {
  await signOut();
  redirect('/login');
}
