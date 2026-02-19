import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';

interface PartialReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  statementItem: {
    description: string;
    amount: number;
    date: string;
  };
  systemItem: {
    description: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    customerName?: string;
  };
  isLoading?: boolean;
}

export function PartialReconciliationModal({
  isOpen,
  onClose,
  onConfirm,
  statementItem,
  systemItem,
  isLoading = false,
}: PartialReconciliationModalProps) {
  const defaultValue = Math.abs(statementItem.amount);
  const [inputValue, setInputValue] = useState<string>(defaultValue.toFixed(2));

  useEffect(() => {
    if (isOpen) {
      setInputValue(Math.abs(statementItem.amount).toFixed(2));
    }
  }, [isOpen, statementItem.amount]);

  const parsedValue = useMemo(() => {
    const v = parseFloat(inputValue.replace(',', '.'));
    return isNaN(v) ? 0 : v;
  }, [inputValue]);

  const newBalance = systemItem.remainingAmount - parsedValue;
  const isOverpayment = parsedValue > systemItem.remainingAmount + 0.01;
  const isInvalid = parsedValue <= 0 || isOverpayment;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            Baixa Parcial
          </DialogTitle>
          <DialogDescription>
            Os valores selecionados são diferentes. Confirme o valor a conciliar parcialmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* System Item */}
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lançamento do Sistema</p>
            <p className="text-sm font-bold text-foreground">
              {systemItem.customerName || systemItem.description}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">Cheio: {formatCurrency(systemItem.totalAmount)}</span>
              <span className="text-emerald-500">Baixado: {formatCurrency(systemItem.paidAmount)}</span>
              <span className="text-red-400 font-bold">Faltante: {formatCurrency(systemItem.remainingAmount)}</span>
            </div>
          </div>

          {/* Statement Item */}
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entrada do Extrato</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground truncate">{statementItem.description}</p>
              <Badge variant="secondary" className="text-xs shrink-0">
                {formatCurrency(Math.abs(statementItem.amount))}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{statementItem.date}</p>
          </div>

          {/* Input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Valor a Conciliar</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="text-lg font-bold"
            />
          </div>

          {/* Live calculation */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">Novo Saldo Devedor</span>
            <span className={cn(
              'text-lg font-bold font-mono',
              newBalance < 0.01 ? 'text-emerald-400' : 'text-foreground'
            )}>
              {formatCurrency(Math.max(newBalance, 0))}
            </span>
          </div>

          {/* Warning */}
          {isOverpayment && (
            <div className="flex items-center gap-2 text-sm text-red-400 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>O valor não pode exceder o saldo faltante ({formatCurrency(systemItem.remainingAmount)})</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(parsedValue)}
            disabled={isInvalid || isLoading}
            className="gap-2"
          >
            {isLoading ? 'Processando...' : 'Confirmar Baixa Parcial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
