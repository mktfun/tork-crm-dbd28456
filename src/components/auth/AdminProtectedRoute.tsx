import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('🔐 No user session - redirecting to admin login');
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Fetch profile to check role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const hasAdminRole = profile?.role === 'admin';
        console.log('🔐 Admin check:', { userId: user.id, role: profile?.role, isAdmin: hasAdminRole });
        
        setIsAdmin(hasAdminRole);
      } catch (error) {
        console.error('Admin check error:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  // Premium loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(39,39,42,0.2)_0%,_transparent_60%)]" />
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-zinc-400" />
            <span className="text-xl font-medium text-zinc-300">Verificando permissões...</span>
          </div>
          
          <div className="w-48 mx-auto">
            <div className="h-[2px] bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full w-full progress-metallic" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not authenticated - redirect to admin login
  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" state={{ from: location }} replace />;
  }

  // Authenticated but not admin - redirect to regular dashboard with 403
  if (!isAdmin) {
    console.warn('⛔ 403 - User attempted to access admin area without privileges');
    return <Navigate to="/dashboard" state={{ error: 'forbidden' }} replace />;
  }

  // Admin verified - render children
  return <>{children}</>;
}
