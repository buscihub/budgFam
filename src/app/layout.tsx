import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'budgFam',
  description: 'Budget di famiglia e cose da fare condivise',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
