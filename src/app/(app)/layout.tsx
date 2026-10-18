import { AppNav } from './app-nav';

// The shell of the signed-in app: three entries, no more (ADR-013). Settings,
// accounts and "da rivedere" are reached from inside the screens (ADR-026).
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
