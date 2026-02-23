import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, FileText, CreditCard, User, LogOut, Loader2, Shield, Inbox, Sun, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PortalClient {
  id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  portal_password: string | null;
  portal_first_access: boolean;
  user_id: string;
}

interface PortalBrokerage {
  id: number;
  name: string;
  logo_url: string | null;
  slug: string;
}

interface PortalConfig {
  show_policies: boolean;
  show_cards: boolean;
  allow_profile_edit: boolean;
}

interface GetBrokerageResponse {
  success: boolean;
  brokerage?: PortalBrokerage;
}

export function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { brokerageSlug } = useParams<{ brokerageSlug: string }>();
  const { theme, setTheme } = useTheme();
  const [client, setClient] = useState<PortalClient | null>(null);
  const [brokerage, setBrokerage] = useState<PortalBrokerage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [portalConfig, setPortalConfig] = useState<PortalConfig>({
    show_policies: true,
    show_cards: true,
    allow_profile_edit: true,
  });

  // Hook de navegação - DEVE ficar ANTES de qualquer return condicional
  useEffect(() => {
    if (!isLoading && !client) {
      navigate(`/${brokerageSlug}/portal`, { replace: true });
    }
  }, [client, isLoading, navigate, brokerageSlug]);

  useEffect(() => {
    const loadData = async () => {
      const clientData = sessionStorage.getItem('portal_client');
      const storedSlug = sessionStorage.getItem('portal_brokerage_slug');
      const brokerageData = sessionStorage.getItem('portal_brokerage');

      if (clientData && storedSlug === brokerageSlug) {
        setClient(JSON.parse(clientData));

        if (brokerageData) {
          setBrokerage(JSON.parse(brokerageData));
        } else if (brokerageSlug) {
          try {
            const { data } = await supabase.rpc('get_brokerage_by_slug', {
              p_slug: brokerageSlug
            });
            const response = data as unknown as GetBrokerageResponse;
            if (response?.success && response?.brokerage) {
              setBrokerage(response.brokerage);
              sessionStorage.setItem('portal_brokerage', JSON.stringify(response.brokerage));
            }
          } catch (err) {
            console.error('Error fetching brokerage:', err);
          }
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [brokerageSlug]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground tracking-widest text-sm font-light">CARREGANDO</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('portal_client');
    sessionStorage.removeItem('portal_brokerage_slug');
    sessionStorage.removeItem('portal_brokerage');
    navigate(`/${brokerageSlug}/portal`);
  };

  const isActive = (path: string) => location.pathname === `/${brokerageSlug}/portal/${path}`;

  const LABEL_WIDTH = 56;
  const renderNavItem = ({
    path,
    label,
    icon: Icon,
    onClick,
  }: {
    path: string;
    label: string;
    icon: React.ElementType;
    onClick: () => void;
  }) => {
    const active = isActive(path);
    return (
      <button
        key={path}
        onClick={onClick}
        className={cn(
          'relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors duration-200',
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {active && (
          <motion.div
            layoutId="portal-nav-pill"
            className="absolute inset-0 bg-primary/10 rounded-xl"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <Icon className="w-5 h-5 relative z-10" />
        <motion.span
          className="text-xs font-medium relative z-10 overflow-hidden whitespace-nowrap"
          initial={false}
          animate={{ width: active ? LABEL_WIDTH : 0, opacity: active ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        >
          {label}
        </motion.span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-2xl border-b border-border px-3 py-3 sm:p-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brokerage?.logo_url ? (
              <img
                src={brokerage.logo_url}
                alt={brokerage.name}
                className="h-10 object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-foreground font-light tracking-wide">
                Olá, {client.name?.split(' ')[0]}
              </h1>
              <p className="text-muted-foreground text-xs tracking-wide">
                {brokerage?.name || 'Portal do Segurado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 transition-transform duration-500 rotate-0 hover:rotate-90" />
              ) : (
                <Moon className="w-5 h-5 transition-transform duration-500 rotate-0 hover:-rotate-12" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 py-4 sm:px-6 sm:py-6 max-w-lg mx-auto">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation — Framer Motion Pill Nav */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 safe-area-pb">
        <div className="max-w-lg mx-auto bg-background/80 backdrop-blur-2xl border border-border rounded-2xl shadow-lg px-2 py-2 flex justify-around items-center">
          {renderNavItem({ path: 'home', label: 'Início', icon: Home, onClick: () => navigate(`/${brokerageSlug}/portal/home`) })}
          {portalConfig.show_policies && renderNavItem({ path: 'policies', label: 'Seguros', icon: FileText, onClick: () => navigate(`/${brokerageSlug}/portal/policies`) })}
          {portalConfig.show_cards && renderNavItem({ path: 'cards', label: 'Carteiras', icon: CreditCard, onClick: () => navigate(`/${brokerageSlug}/portal/cards`) })}
          {renderNavItem({ path: 'solicitacoes', label: 'Inbox', icon: Inbox, onClick: () => navigate(`/${brokerageSlug}/portal/solicitacoes`) })}
          {renderNavItem({ path: 'profile', label: 'Perfil', icon: User, onClick: () => navigate(`/${brokerageSlug}/portal/profile`) })}
        </div>
      </nav>
    </div>
  );
}
