
import { useMemo } from 'react';
import { useSupabasePolicies } from './useSupabasePolicies';
import { useSupabaseClients } from './useSupabaseClients';
import { differenceInDays, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

export function useSupabaseRenewalMetrics() {
  const { policies, isLoading: policiesLoading } = useSupabasePolicies();
  const { clients, loading: clientsLoading } = useSupabaseClients();

  const metrics = useMemo(() => {
    if (policiesLoading || clientsLoading) {
      return {
        apolicesParaRenovar: [],
        renovacoesNoMes: 0,
        valorEmRenovacao: 0,
        taxaDeRetencao: 0,
        acoesPendentes: 0
      };
    }

    const today = new Date();
    const currentMonth = new Date();
    
    // Filtra apólices que vencem em 90 dias
    const apolicesParaRenovar = policies
      .filter(policy => {
        if (!policy.expirationDate || policy.status !== 'Ativa') return false;
        const diasParaVencer = differenceInDays(new Date(policy.expirationDate), today);
        return diasParaVencer >= 0 && diasParaVencer <= 90;
      })
      .sort((a, b) => {
        // Ordena por data de vencimento (mais próxima primeiro)
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      })
      .map(policy => {
        const client = clients.find(c => c.id === policy.clientId);
        return {
          id: policy.id,
          policyNumber: policy.policyNumber,
          clientId: policy.clientId,
          clientName: client?.name || 'Cliente não encontrado',
          expirationDate: policy.expirationDate,
          premiumValue: Number(policy.premiumValue),
          type: policy.type,
          insuranceCompany: policy.insuranceCompany,
          statusRenovacao: policy.renewalStatus,
          diasParaVencer: differenceInDays(new Date(policy.expirationDate), today),
          status: policy.status
        };
      });

    // Renovações do mês atual
    const renovacoesNoMes = policies.filter(policy => {
      if (!policy.expirationDate) return false;
      const expirationDate = new Date(policy.expirationDate);
      return isWithinInterval(expirationDate, {
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
      });
    }).length;

    // Valor total em renovação
    const valorEmRenovacao = apolicesParaRenovar.reduce((total, policy) => {
      return total + policy.premiumValue;
    }, 0);

    // Taxa de retenção (simulada - baseada nos status)
    const renovacoesComStatus = apolicesParaRenovar.filter(p => p.statusRenovacao);
    const renovacoesEfetivadas = renovacoesComStatus.filter(p => p.statusRenovacao === 'Renovada').length;
    const taxaDeRetencao = renovacoesComStatus.length > 0 
      ? Math.round((renovacoesEfetivadas / renovacoesComStatus.length) * 100)
      : 0;

    // Ações pendentes (sem status ou pendentes)
    const acoesPendentes = apolicesParaRenovar.filter(p => 
      !p.statusRenovacao || p.statusRenovacao === 'Pendente'
    ).length;

    return {
      apolicesParaRenovar,
      renovacoesNoMes,
      valorEmRenovacao,
      taxaDeRetencao,
      acoesPendentes
    };
  }, [policies, clients, policiesLoading, clientsLoading]);

  return {
    ...metrics,
    loading: policiesLoading || clientsLoading
  };
}
