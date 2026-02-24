import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { User, Building, Users, Shield, Tag, MessageCircle, Globe } from 'lucide-react';
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
    { id: '/dashboard/settings/chat-tork', label: <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Chat</span> },
    { id: '/dashboard/settings/portal', label: <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Portal</span> }
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
