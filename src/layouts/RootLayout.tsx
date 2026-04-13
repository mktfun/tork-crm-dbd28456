import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { GlassSidebar } from '@/components/layout/GlassSidebar';
import { Header } from '@/components/layout/Header';
import { SearchCommand } from '@/components/SearchCommand';
import { ModernMobileNav } from '@/components/layout/ModernMobileNav';
import { AmorimAIFloating } from '@/components/ai/AmorimAIFloating';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRealtimeClients } from '@/hooks/useRealtimeClients';
import { cn } from '@/lib/utils';

export function RootLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  // 🚀 **REALTIME GLOBAL** - Ativo em toda a aplicação
  useRealtimeClients();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Gradiente radial sutil para profundidade - estilo fintech */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsl(var(--secondary) / 0.4) 0%, transparent 40%)'
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 flex h-full w-full">
        {/* SIDEBAR APENAS NO DESKTOP */}
        {!isMobile && <GlassSidebar />}

        {/* RESTO DA TELA - HEADER + CONTEÚDO */}
        <div className="flex flex-1 flex-col min-w-0">

          {/* HEADER CONTAINER */}
          <div className="flex-shrink-0 w-full">
            <Header onSearchClick={() => setIsSearchOpen(true)} />
          </div>

          {/* ÁREA PRINCIPAL ONDE AS PÁGINAS VÃO APARECER */}
          <main className={cn(
            "flex-1 overflow-hidden",
            isMobile && "pb-20"
          )}>
            <Outlet />
          </main>
        </div>
      </div>

      {/* NAVEGAÇÃO MODERNA APENAS NO MOBILE */}
      {isMobile && <ModernMobileNav />}

      {/* ASSISTENTE IA FLUTUANTE */}
      <AmorimAIFloating />

      {/* BUSCA UNIVERSAL */}
      <SearchCommand open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}
