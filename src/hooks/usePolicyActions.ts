
import { useState } from 'react';
import { usePolicies } from '@/hooks/useAppData';
import { Policy } from '@/types';
import { toast } from '@/hooks/use-toast';

export function usePolicyActions() {
  const { updatePolicy } = usePolicies();
  const [isUpdating, setIsUpdating] = useState(false);

  const updatePolicyStatus = async (policyId: string, newStatus: Policy['status']) => {
    setIsUpdating(true);
    try {
      await updatePolicy(policyId, { status: newStatus });
      
      const statusMessages = {
        'Ativa': 'Apólice ativada com sucesso',
        'Cancelada': 'Apólice cancelada com sucesso',
        'Orçamento': 'Apólice convertida para orçamento',
        'Aguardando Apólice': 'Status atualizado para aguardando apólice',
        'Renovada': 'Apólice renovada com sucesso'
      };

      toast({
        title: "Status atualizado",
        description: statusMessages[newStatus] || "Status atualizado com sucesso",
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao atualizar o status da apólice.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updatePolicyStatus,
    isUpdating
  };
}
