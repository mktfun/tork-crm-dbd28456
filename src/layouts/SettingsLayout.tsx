import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { User, Building, Users, Shield, Tag } from 'lucide-react';
import { AnimatedTabs, Tab } from '@/components/ui/animated-tabs';

export function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { id: '/dashboard/settings/profile', label: <span className="flex items-center gap-2"><User className="w-4 h-4" /> Perfil</span> },
    { id: '/dashboard/settings/brokerages', label: <span className="flex items-center gap-2"><Building className="w-4 h-4" /> Corretoras</span> },
    { id: '/dashboard/settings/producers', label: <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Produtores</span> },
    { id: '/dashboard/settings/companies', label: <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Seguradoras</span> },
    { id: '/dashboard/settings/ramos', label: <span className="flex items-center gap-2"><Tag className="w-4 h-4" /> Ramos</span> },
    { id: '/dashboard/settings/integrations', label: <span className="flex items-center gap-2"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 13 2.5-2.5"/><path d="M14 21v-3.5c0-1 .4-2 1.1-2.8.4-.3.9-.6 1.4-.8C18 14.3 19 13.2 19 12v-1.5c0-1.8-1.5-3.3-3.3-3.3h-1.5c-1.2 0-2.3 1-2.8 2.5-.2.5-.5 1-.8 1.4-.8.7-1.8 1.1-2.8 1.1H5.3C3.5 12 2 13.5 2 15.3V17c0 1.2 1 2.3 2.5 2.8.5.2 1 .5 1.4.8.7.8 1.1 1.8 1.1 2.8V21"/><path d="M6 5.5A2.5 2.5 0 0 1 8.5 3h7A2.5 2.5 0 0 1 18 5.5v0A2.5 2.5 0 0 1 15.5 8h-7A2.5 2.5 0 0 1 6 5.5v0Z"/></svg> Integrações</span> }
  ];

  const getActiveTabFromPath = () => {
    const item = navItems.find((nav) => location.pathname.includes(nav.id));
    return item ? item.id : navItems[0].id; // Fallback para a primeira aba
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromPath());

  useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (id: string) => {
    navigate(id);
  };

  const tabs: Tab[] = navItems.map((item) => ({
    id: item.id,
    label: item.label,
    content: (
      <div className="w-full h-full relative z-10 pt-4">
        <Outlet />
      </div>
    )
  }));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-4 h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e configurações do sistema em um só lugar.
        </p>
      </div>

      <div className="w-full relative z-0 flex-1 overflow-y-auto pr-2 pb-10">
        <AnimatedTabs
          tabs={tabs}
          defaultTab={activeTab}
          onChange={handleTabChange}
        />
      </div>
    </div>
  );
}
