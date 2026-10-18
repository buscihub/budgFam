import { AppNav } from './app-nav';
import styles from './shell.module.css';

// The shell of the signed-in app: three entries, no more (ADR-013). Settings,
// accounts and "da rivedere" are reached from inside the screens (ADR-026).
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className={styles.shell}>
      <AppNav />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
