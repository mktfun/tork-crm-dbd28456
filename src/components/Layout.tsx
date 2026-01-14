
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <main className="pb-24 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
