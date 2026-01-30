import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useBankAccounts, 
  useDistributeTransactionToBanks,
  type BankDistribution 
} from "@/hooks/useBancos";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DistributeTransactionModalProps {
  open: boolean;
  onClose: () => void;
  transactionId: string;
  transactionAmount: number;
  transactionDescription: string;
}

interface DistributionRow {
  id: string;
  bankAccountId: string;
  amount: number;
  percentage: number;
}

export function DistributeTransactionModal({
  open,
  onClose,
  transactionId,
  transactionAmount,
  transactionDescription,
}: DistributeTransactionModalProps) {
  const { data: bankSummary } = useBankAccounts();
  const distributeMutation = useDistributeTransactionToBanks();

  const [distributions, setDistributions] = useState<DistributionRow[]>([
    { id: '1', bankAccountId: '', amount: 0, percentage: 0 },
    { id: '2', bankAccountId: '', amount: 0, percentage: 0 },
  ]);

  const banks = bankSummary?.accounts?.filter(b => b.isActive) || [];

  // Calcular totais
  const totalAmount = distributions.reduce((sum, d) => sum + d.amount, 0);
  const totalPercentage = distributions.reduce((sum, d) => sum + d.percentage, 0);
  const remaining = transactionAmount - totalAmount;

  const handleAddDistribution = () => {
    setDistributions([
      ...distributions,
      { id: Date.now().toString(), bankAccountId: '', amount: 0, percentage: 0 },
    ]);
  };

  const handleRemoveDistribution = (id: string) => {
    if (distributions.length <= 2) {
      toast.error('Mínimo de 2 distribuições');
      return;
    }
    setDistributions(distributions.filter(d => d.id !== id));
  };

  const handleBankChange = (id: string, bankAccountId: string) => {
    setDistributions(distributions.map(d =>
      d.id === id ? { ...d, bankAccountId } : d
    ));
  };

  const handleAmountChange = (id: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const percentage = transactionAmount > 0 ? (amount / transactionAmount) * 100 : 0;
    
    setDistributions(distributions.map(d =>
      d.id === id ? { ...d, amount, percentage: Math.round(percentage * 100) / 100 } : d
    ));
  };

  const handlePercentageChange = (id: string, value: string) => {
    const percentage = parseFloat(value) || 0;
    const amount = (transactionAmount * percentage) / 100;
    
    setDistributions(distributions.map(d =>
      d.id === id ? { ...d, percentage, amount: Math.round(amount * 100) / 100 } : d
    ));
  };

  const handleAutoDistribute = () => {
    const count = distributions.length;
    const amountPerBank = transactionAmount / count;
    const percentagePerBank = 100 / count;

    setDistributions(distributions.map(d => ({
      ...d,
      amount: Math.round(amountPerBank * 100) / 100,
      percentage: Math.round(percentagePerBank * 100) / 100,
    })));
  };

  const handleSubmit = async () => {
    // Validações
    const hasEmptyBank = distributions.some(d => !d.bankAccountId);
    if (hasEmptyBank) {
      toast.error('Selecione um banco para cada distribuição');
      return;
    }

    const hasDuplicateBank = new Set(distributions.map(d => d.bankAccountId)).size !== distributions.length;
    if (hasDuplicateBank) {
      toast.error('Não é possível selecionar o mesmo banco mais de uma vez');
      return;
    }

    if (Math.abs(totalAmount - transactionAmount) > 0.01) {
      toast.error(`A soma das distribuições (${formatCurrency(totalAmount)}) deve ser igual ao valor total (${formatCurrency(transactionAmount)})`);
      return;
    }

    try {
      const bankDistributions: BankDistribution[] = distributions.map(d => ({
        bankAccountId: d.bankAccountId,
        amount: d.amount,
        percentage: d.percentage,
      }));

      await distributeMutation.mutateAsync({
        transactionId,
        distributions: bankDistributions,
      });

      toast.success('Transação distribuída com sucesso!');
      onClose();
    } catch (error: any) {
      toast.error('Erro ao distribuir transação: ' + error.message);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Distribuir Transação entre Bancos</DialogTitle>
          <DialogDescription>
            Divida o valor desta transação entre múltiplas contas bancárias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info da Transação */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Transação</p>
              <p className="font-medium">{transactionDescription}</p>
              <p className="text-lg font-bold">{formatCurrency(transactionAmount)}</p>
            </div>
          </Card>

          {/* Botão de Distribuição Automática */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoDistribute}
            className="w-full"
          >
            Distribuir Igualmente
          </Button>

          {/* Distribuições */}
          <div className="space-y-3">
            {distributions.map((dist, index) => (
              <Card key={dist.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Distribuição {index + 1}</Label>
                    {distributions.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDistribution(dist.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3">
                    {/* Banco */}
                    <div className="space-y-1">
                      <Label className="text-xs">Banco</Label>
                      <Select
                        value={dist.bankAccountId}
                        onValueChange={(v) => handleBankChange(dist.id, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um banco" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              <div className="flex items-center gap-2">
                                <span>{bank.icon}</span>
                                <span>{bank.bankName}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Valor e Percentual */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dist.amount || ''}
                          onChange={(e) => handleAmountChange(dist.id, e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Percentual (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dist.percentage || ''}
                          onChange={(e) => handlePercentageChange(dist.id, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Adicionar Distribuição */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddDistribution}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Banco
          </Button>

          {/* Resumo */}
          <Card className={`p-4 ${Math.abs(remaining) > 0.01 ? 'border-amber-500 bg-amber-500/10' : 'border-emerald-500 bg-emerald-500/10'}`}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Distribuído:</span>
                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Percentual Total:</span>
                <span className="font-semibold">{totalPercentage.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Restante:</span>
                <span className={`font-bold ${Math.abs(remaining) > 0.01 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={distributeMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={distributeMutation.isPending || Math.abs(remaining) > 0.01}
          >
            {distributeMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Distribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
