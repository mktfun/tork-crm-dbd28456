
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePolicies, useTransactions } from '@/hooks/useAppData';

export function TesteParcelas() {
  const [isCreating, setIsCreating] = useState(false);
  const { addPolicy } = usePolicies();
  const { addPartialPayment } = useTransactions();

  const criarApoliceTeste = async () => {
    setIsCreating(true);
    try {
      console.log('🧪 Criando apólice de teste...');
      
      await addPolicy({
        clientId: 'test-client-id',
        policyNumber: `TESTE-${Date.now()}`,
        insuranceCompany: 'Seguradora Teste',
        type: 'Auto',
        insuredAsset: 'Veículo Teste',
        premiumValue: 1000,
        commissionRate: 20,
        status: 'Ativa',
        expirationDate: '2025-12-31',
        startDate: '2025-01-01',
        userId: 'test-user-id',
        automaticRenewal: true // ✅ ADICIONADO: Campo obrigatório
      });

      console.log('✅ Apólice de teste criada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar apólice de teste:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="p-4 max-w-md">
      <h3 className="text-lg font-bold mb-4 text-center">🧪 Teste de Parcelas</h3>
      
      <div className="space-y-4">
        <Button 
          onClick={criarApoliceTeste} 
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'Criando...' : 'Criar Apólice de Teste'}
        </Button>
        
        <div className="text-xs text-muted-foreground text-center">
          Isso criará uma apólice com comissão única no faturamento
        </div>
      </div>
    </Card>
  );
}
