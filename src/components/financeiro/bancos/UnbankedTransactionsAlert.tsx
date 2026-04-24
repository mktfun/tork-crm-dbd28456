import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnbankedTransactions, useBankAccounts, useAssignBankToTransactions, type BankAccount } from '@/hooks/useBancos';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function UnbankedTransactionsAlert() {
  const { data: unbanked = [], isLoading } = useUnbankedTransactions(500);
  const { data: bankSummary } = useBankAccounts();
  const assignBank = useAssignBankToTransactions();

  const [open, setOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (isLoading || unbanked.length === 0) return null;

  const totalUnbanked = unbanked.reduce((acc, tx) => acc + tx.amount, 0);
  const activeAccounts = bankSummary?.accounts.filter((a: BankAccount) => a.isActive) ?? [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(unbanked.map(tx => tx.transactionId)));
  const clearAll = () => setSelectedIds(new Set());

  const handleAssign = async () => {
    if (!selectedBank || selectedIds.size === 0) return;
    await assignBank.mutateAsync({
      transactionIds: Array.from(selectedIds),
      bankAccountId: selectedBank,
    });
    setSelectedIds(new Set());
    setSelectedBank('');
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
        {/* Header clicável */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-amber-500/10 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/15">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  {unbanked.length} transação(ões) sem banco vinculado
                </p>
                <p className="text-xs text-amber-400/70">
                  {formatCurrency(totalUnbanked)} não alocados a nenhuma conta bancária
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">
                Clique para vincular
              </Badge>
              {open ? (
                <ChevronUp className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Painel expansível */}
        <CollapsibleContent>
          <div className="border-t border-amber-500/20 p-4 space-y-4">
            {/* Barra de ação */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-52">
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger className="bg-background/60 border-amber-500/30 text-sm h-9">
                    <SelectValue placeholder="Selecionar banco destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((acc: BankAccount) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2">
                          {acc.color && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: acc.color }}
                            />
                          )}
                          {acc.bankName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs text-amber-400 hover:text-amber-300 h-9"
                >
                  Selecionar todos
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs text-muted-foreground h-9"
                  >
                    Limpar
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={!selectedBank || selectedIds.size === 0 || assignBank.isPending}
                  onClick={handleAssign}
                  className="h-9 bg-amber-500 hover:bg-amber-600 text-black font-medium gap-1"
                >
                  {assignBank.isPending ? 'Vinculando...' : `Vincular ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Lista de transações */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {unbanked.map(tx => (
                <div
                  key={tx.transactionId}
                  onClick={() => toggleSelect(tx.transactionId)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors text-sm border ${
                    selectedIds.has(tx.transactionId)
                      ? 'bg-amber-500/20 border-amber-500/40'
                      : 'bg-background/40 border-transparent hover:bg-background/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        selectedIds.has(tx.transactionId)
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {selectedIds.has(tx.transactionId) && (
                        <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10 3L5 8L2 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground font-medium truncate">{tx.description}</p>
                      <p className="text-muted-foreground text-xs">{tx.transactionDate}</p>
                    </div>
                  </div>
                  <span
                    className={`font-mono font-semibold flex-shrink-0 ml-2 ${
                      tx.transactionType === 'receita' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {tx.transactionType === 'receita' ? '+' : '-'}
                    {formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
