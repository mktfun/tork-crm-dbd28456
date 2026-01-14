
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useTransactionTypes } from '@/hooks/useAppData';
import type { Tables } from '@/integrations/supabase/types';

type TransactionType = Tables<'transaction_types'>;

export function GestaoTiposTransacao() {
  const { 
    transactionTypes, 
    loading, 
    addTransactionType, 
    isAdding 
  } = useTransactionTypes();
  
  const [newType, setNewType] = useState<{
    name: string;
    nature: 'GANHO' | 'PERDA';
  }>({
    name: '',
    nature: 'GANHO'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newType.name.trim()) {
      return;
    }

    try {
      await addTransactionType({
        name: newType.name.trim(),
        nature: newType.nature
      });

      setNewType({
        name: '',
        nature: 'GANHO'
      });
    } catch (error) {
      console.error('Erro ao criar tipo de transação:', error);
    }
  };

  const ganhoTypes = transactionTypes.filter(t => t.nature === 'GANHO');
  const perdaTypes = transactionTypes.filter(t => t.nature === 'PERDA');

  if (loading) {
    return (
      <SettingsPanel 
        title="Tipos de Transação" 
        description="Gerencie os tipos de receitas e despesas do sistema"
        icon={DollarSign}
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <span className="ml-2 text-slate-300">Carregando tipos de transação...</span>
        </div>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel 
      title="Tipos de Transação" 
      description="Gerencie os tipos de receitas e despesas do sistema"
      icon={DollarSign}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium text-slate-200 flex items-center gap-2">
            <Plus size={16} />
            Adicionar Novo Tipo
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="type-name" className="text-slate-400">Nome do Tipo</Label>
              <Input 
                id="type-name" 
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                placeholder="Ex: Taxa de Serviço, Reembolso..." 
                className="mt-1" 
                disabled={isAdding}
              />
            </div>

            <div>
              <Label className="text-base font-medium text-slate-400">Natureza da Transação</Label>
              
              <RadioGroup 
                value={newType.nature}
                onValueChange={(value) => setNewType({ ...newType, nature: value as 'GANHO' | 'PERDA' })}
                className="mt-3 grid grid-cols-2 gap-4"
                disabled={isAdding}
              >
                <Label
                  htmlFor="ganho"
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 bg-slate-900/50 p-4 cursor-pointer transition-colors hover:bg-slate-800/60 ${
                    newType.nature === 'GANHO' 
                      ? 'border-green-500 bg-green-900/40' 
                      : 'border-slate-700'
                  } ${isAdding ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <RadioGroupItem value="GANHO" id="ganho" className="sr-only" />
                  <TrendingUp className="h-6 w-6 text-green-400" />
                  <span className="font-medium text-green-400">Ganho</span>
                  <p className="text-xs text-slate-500">Receita, comissão</p>
                </Label>
                
                <Label
                  htmlFor="perda"
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 bg-slate-900/50 p-4 cursor-pointer transition-colors hover:bg-slate-800/60 ${
                    newType.nature === 'PERDA' 
                      ? 'border-red-500 bg-red-900/40' 
                      : 'border-slate-700'
                  } ${isAdding ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <RadioGroupItem value="PERDA" id="perda" className="sr-only" />
                  <TrendingDown className="h-6 w-6 text-red-400" />
                  <span className="font-medium text-red-400">Perda</span>
                  <p className="text-xs text-slate-500">Despesa, reembolso</p>
                </Label>
              </RadioGroup>
            </div>
            
            <Button type="submit" className="w-full" disabled={isAdding || !newType.name.trim()}>
              {isAdding ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  Adicionar Tipo
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-green-400 flex items-center gap-2">
              <TrendingUp size={20} />
              Tipos de Ganho ({ganhoTypes.length})
            </h4>
            {ganhoTypes.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                Nenhum tipo de ganho cadastrado
              </div>
            ) : (
              ganhoTypes.map(type => (
                <div key={type.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3">
                  <span className="font-medium text-slate-300">{type.name}</span>
                  <span className="text-xs text-green-400 font-medium">GANHO</span>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-red-400 flex items-center gap-2">
              <TrendingDown size={20} />
              Tipos de Perda ({perdaTypes.length})
            </h4>
            {perdaTypes.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                Nenhum tipo de perda cadastrado
              </div>
            ) : (
              perdaTypes.map(type => (
                <div key={type.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3">
                  <span className="font-medium text-slate-300">{type.name}</span>
                  <span className="text-xs text-red-400 font-medium">PERDA</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SettingsPanel>
  );
}
