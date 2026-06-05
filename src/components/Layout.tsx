import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

/**
 * Shared shell wrapping every page: suite header, the routed content, and a
 * footer carrying the persistent clinical disclaimer + no-PID reminder.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      <Footer />
    </div>
  );
}
