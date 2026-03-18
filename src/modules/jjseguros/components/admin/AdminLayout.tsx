import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  // Auth is already handled by the CRM's ProtectedRoute wrapper,
  // so no additional auth check is needed here.
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}
