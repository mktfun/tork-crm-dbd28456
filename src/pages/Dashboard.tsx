import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardKpis } from '@/components/dashboard/DashboardKpis';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardController } from '@/components/dashboard/DashboardController';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
// DashboardGlobalInsight merged into ThinkingCard
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useGlassSystemProtection } from '@/hooks/useGlassSystemProtection';
import type { OnboardingStep } from '@/types/onboarding';

/**
 * 🔒 DASHBOARD COM PROTEÇÃO GLASS SYSTEM 🔒
 *
 * ⚠️ Este dashboard usa o sistema Liquid Glass crítico
 * ❌ NÃO alterar a estrutura de DashboardKpis
 * ❌ NÃO remover classes CSS dos containers
 *
 * COMPONENTES PROTEGIDOS:
 * - DashboardKpis (contém KpiCards críticos)
 * - Todas as seções com className específicas
 *
 * ✅ Sistema de monitoramento ativo via useGlassSystemProtection
 */

const dashboardSteps: OnboardingStep[] = [
  {
    target: '.dashboard-header',
    content: 'Bem-vindo ao seu painel de controle! Aqui você terá uma visão completa da sua operação como corretor de seguros.',
    title: '🎉 Bem-vindo!',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.dashboard-global-insight',
    content: 'Este cartão mostra insights inteligentes sobre sua performance, destacando tendências importantes dos seus dados.',
    title: '💡 Insights Estratégicos',
    placement: 'bottom',
  },
  {
    target: '.dashboard-kpis',
    content: 'Aqui estão suas métricas principais: clientes ativos, renovações críticas, comissões e novas apólices. Clique em qualquer KPI para ver mais detalhes.',
    title: '📊 KPIs Principais',
    placement: 'bottom',
  },
  {
    target: '.performance-chart',
    content: 'Este gráfico mostra sua performance financeira ao longo do tempo. Use os filtros para personalizar a visualização.',
    title: '📈 Performance Financeira',
    placement: 'top',
  },
  {
    target: '.dashboard-sidebar',
    content: 'Aqui você vê seus próximos agendamentos e pode gerenciar sua agenda rapidamente.',
    title: '📅 Agendamentos',
    placement: 'left',
  },
  {
    target: '.dashboard-controller',
    content: 'Use estes controles para visualizar gráficos adicionais e análises detalhadas dos seus dados.',
    title: '🎛️ Controles Avançados',
    placement: 'top',
  },
  {
    target: 'body',
    content: 'Perfeito! Agora você conhece as principais funcionalidades do dashboard. Explore o sistema e comece a gerenciar seus seguros com eficiência!',
    title: '✅ Tutorial Concluído',
    placement: 'center',
  }
];

import { ThinkingCard, ThinkingStep } from '@/components/ai/ThinkingCard';

// ... imports anteriores

export default function Dashboard() {
  usePageTitle('Dashboard');

  // 🛡️ SISTEMA DE PROTEÇÃO DISPONÍVEL - Ative quando necessário para debug
  // useGlassSystemProtection(); // Desabilitado para reduzir logs

  // Para os KPIs principais e insights globais, usar dados do mês atual (sem filtro)
  const metrics = useDashboardMetrics();
  const { data: profile, isLoading: profileIsLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  // Compact mode: no reasoning steps, only strategic summary
  const aiReasoningSteps: ThinkingStep[] = [];

  // A LÓGICA CORRETA E SEGURA
  const shouldShowOnboarding = !profileIsLoading && profile && profile.onboarding_completed === false;

  // Função para completar o onboarding
  const completeOnboarding = async () => {
    if (!profile) return;

    try {
      console.log('🎯 Marcando onboarding como concluído...');
      await updateProfileMutation.mutateAsync({
        onboarding_completed: true
      });
      console.log('✅ Onboarding marcado como concluído!');
    } catch (error) {
      console.error('❌ Erro ao marcar onboarding como concluído:', error);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 h-full">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* HEADER DE PÁGINA ROBUSTO */}
        <div className="dashboard-header">
          <DashboardHeader />
        </div>

        {/* CARD DE INSIGHT GLOBAL ESTRATÉGICO + RACIOCÍNIO IA */}
        <div className="dashboard-global-insight grid grid-cols-1">
          <ThinkingCard
            steps={aiReasoningSteps}
            isThinking={true}
            strategicSummary={{ focus: 'general' }}
          />
        </div>

        {/* GRADE DE KPIs - SEM FILTRO DE DATA (dados do mês atual) */}
        <div className="dashboard-kpis">
          <DashboardKpis />
        </div>

        {/* LINHA 2: Performance Chart (2/3) + Próximos Agendamentos (1/3) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 performance-chart">
            <PerformanceChart />
          </div>
          <div className="lg:col-span-1 dashboard-sidebar">
            <DashboardSidebar />
          </div>
        </div>

        {/* LINHA 3: Sistema de Controle de Gráficos - COM FILTRO DE DATA PRÓPRIO */}
        <div className="dashboard-controller">
          <DashboardController />
        </div>

        {/* SISTEMA DE ONBOARDING À PROVA DE FALHAS */}
        {shouldShowOnboarding && (
          <OnboardingTour
            steps={dashboardSteps}
            isActive={true}
            onComplete={completeOnboarding}
          />
        )}
      </div>
    </div>
  );
}
