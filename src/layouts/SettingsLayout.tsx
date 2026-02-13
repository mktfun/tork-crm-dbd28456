
import { Outlet } from 'react-router-dom';
import { SettingsNavigation } from '@/components/settings/SettingsNavigation';
import { useIsMobile } from '@/hooks/use-mobile';

export function SettingsLayout() {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e configurações do sistema
        </p>
      </div>

      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-4'}`}>
        {/* Navegação lateral */}
        <div className={isMobile ? 'order-2' : 'order-1'}>
          <SettingsNavigation />
        </div>

        {/* Conteúdo principal */}
        <div className={`${isMobile ? 'order-1 col-span-1' : 'order-2 col-span-3'}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
