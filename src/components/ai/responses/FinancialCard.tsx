import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialSummary {
  total_income?: number;
  total_expenses?: number;
  net_balance?: number;
  transaction_count?: number;
  period?: {
    start: string;
    end: string;
  };
  // Campos alternativos
  receitas?: number;
  despesas?: number;
  saldo?: number;
}

interface FinancialCardProps {
  summary: FinancialSummary;
}

/**
 * FinancialCard: Exibe resumo financeiro em cards com design Liquid Glass.
 */
export const FinancialCard: React.FC<FinancialCardProps> = ({ summary }) => {
  // Normalizar campos (aceita português ou inglês)
  const income = summary.total_income ?? summary.receitas ?? 0;
  const expenses = summary.total_expenses ?? summary.despesas ?? 0;
  const balance = summary.net_balance ?? summary.saldo ?? (income - expenses);

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2 
    });
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <GlassCard className="p-4 space-y-4">
      {/* Período */}
      {summary.period && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b border-white/10">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDate(summary.period.start)} - {formatDate(summary.period.end)}
          </span>
        </div>
      )}

      {/* Grid de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Receitas */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-green-400" />
            <span>Receitas</span>
          </div>
          <p className="text-sm font-semibold text-green-400">
            {formatCurrency(income)}
          </p>
        </div>

        {/* Despesas */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="h-3 w-3 text-red-400" />
            <span>Despesas</span>
          </div>
          <p className="text-sm font-semibold text-red-400">
            {formatCurrency(expenses)}
          </p>
        </div>

        {/* Saldo */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wallet className="h-3 w-3" />
            <span>Saldo</span>
          </div>
          <p className={cn(
            "text-sm font-semibold",
            balance >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Contagem de transações */}
      {summary.transaction_count !== undefined && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-muted-foreground">
            {summary.transaction_count} transações no período
          </p>
        </div>
      )}
    </GlassCard>
  );
};

export default FinancialCard;
