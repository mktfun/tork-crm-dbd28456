import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Skeleton } from '@/components/ui/skeleton';

export function SuperAdminLayout() {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();

  // Proteção: redireciona se não for admin
  useEffect(() => {
    if (!isLoading && profile?.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-64 bg-card" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
