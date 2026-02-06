import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  useBankAccounts,
  useAssignBankToTransactions,
  type UnbankedTransaction
} from "@/hooks/useBancos";
import { toast } from "sonner";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface AssignBankModalProps {
  open: boolean;
  onClose: () => void;
  transactions: UnbankedTransaction[];
}

export function AssignBankModal({ open, onClose, transactions }: AssignBankModalProps) {
  const { data: bankSummary } = useBankAccounts();
  const assignMutation = useAssignBankToTransactions();

  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');

  const banks = bankSummary?.accounts?.filter(b => b.isActive) || [];

  // Filtrar transações por tipo
  const filteredTransactions = useMemo(() => {
    if (filterType === 'all') return transactions;
    return transactions.filter(tx => tx.transactionType === filterType);
  }, [transactions, filterType]);

  // Calcular totais
  const totals = useMemo(() => {
    const selected = filteredTransactions.filter(tx => selectedTransactionIds.has(tx.transactionId));

    const income = selected
      .filter(tx => tx.transactionType === 'receita')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const expense = selected
      .filter(tx => tx.transactionType !== 'receita')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return { income, expense, net: income - expense };
  }, [filteredTransactions, selectedTransactionIds]);

  const handleToggleTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactionIds);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactionIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransactionIds.size === filteredTransactions.length) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(new Set(filteredTransactions.map(tx => tx.transactionId)));
    }
  };

  const handleSubmit = async () => {
    if (selectedTransactionIds.size === 0) {
      toast.error('Selecione pelo menos uma transação');
      return;
    }

    if (!selectedBankId) {
      toast.error('Selecione um banco');
      return;
    }

    try {
      const count = await assignMutation.mutateAsync({
        transactionIds: Array.from(selectedTransactionIds),
        bankAccountId: selectedBankId,
      });

      toast.success(`${count} transação(ões) atribuída(s) com sucesso!`);
      setSelectedTransactionIds(new Set());
      setSelectedBankId('');
      onClose();
    } catch (error: any) {
      toast.error('Erro ao atribuir banco: ' + error.message);
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
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Atribuir Banco a Transações</DialogTitle>
          <DialogDescription>
            Selecione as transações e o banco para vinculá-las.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros e Seleção de Banco */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Filtrar por Tipo</Label>
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas ({transactions.length})</SelectItem>
                  <SelectItem value="receita">
                    Receitas ({transactions.filter(tx => tx.transactionType === 'receita').length})
                  </SelectItem>
                  <SelectItem value="despesa">
                    Despesas ({transactions.filter(tx => tx.transactionType === 'despesa').length})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Banco de Destino</Label>
              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
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
          </div>

          {/* Resumo de Seleção */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedTransactionIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedTransactionIds.size} selecionadas
              </span>
            </div>

            <div className="flex gap-4 text-sm">
              {totals.income > 0 && (
                <span className="text-emerald-500 font-medium">
                  +{formatCurrency(totals.income)}
                </span>
              )}
              {totals.expense > 0 && (
                <span className="text-rose-500 font-medium">
                  -{formatCurrency(totals.expense)}
                </span>
              )}
              {(totals.income === 0 && totals.expense === 0) && (
                <span className="text-muted-foreground">R$ 0,00</span>
              )}
            </div>
          </div>

          {/* Lista de Transações */}
          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-4 space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div
                    key={tx.transactionId}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleToggleTransaction(tx.transactionId)}
                  >
                    <Checkbox
                      checked={selectedTransactionIds.has(tx.transactionId)}
                      onCheckedChange={() => handleToggleTransaction(tx.transactionId)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{tx.description}</p>
                        <Badge variant={tx.status === 'confirmed' ? 'default' : 'outline'} className="text-xs">
                          {tx.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.transactionDate), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {tx.transactionType === 'receita' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                      )}
                      <span className={`font-semibold ${tx.transactionType === 'receita' ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                        {formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={assignMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={assignMutation.isPending || selectedTransactionIds.size === 0 || !selectedBankId}
          >
            {assignMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Atribuir a {selectedTransactionIds.size} Transação(ões)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
