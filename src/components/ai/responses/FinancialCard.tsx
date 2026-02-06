import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartComponent } from './ChartComponent';
import { motion } from 'framer-motion';

interface FinancialSummary {
  total_income?: number;
  total_expenses?: number;
  net_balance?: number;
  transaction_count?: number;
  period?: {
    start: string;
    end: string;
  };
  receitas?: number;
  despesas?: number;
  saldo?: number;
  series?: Array<{ date: string; income: number; expense: number }>;
}

interface FinancialCardProps {
  summary: FinancialSummary;
}

export const FinancialCard: React.FC<FinancialCardProps> = ({ summary }) => {
  const income = summary.total_income ?? summary.receitas ?? 0;
  const expenses = summary.total_expenses ?? summary.despesas ?? 0;
  const balance = summary.net_balance ?? summary.saldo ?? (income - expenses);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const MetricCard = ({ title, value, icon: Icon, color, className, trend }: any) => (
    <GlassCard className={cn("p-4 flex flex-col justify-between relative overflow-hidden", className)}>
      <div className="flex justify-between items-start z-10">
        <div className={cn("p-2 rounded-lg bg-white/5", color)}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <div className={cn("flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/5",
            title === 'Despesas' ? 'text-red-400' : 'text-green-400')}>
            {title === 'Despesas' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowUpRight className="h-3 w-3 mr-1" />}
            {/* Mock trend for visualization */}
          </div>
        )}
      </div>
      <div className="mt-4 z-10">
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        <h4 className="text-lg font-bold text-foreground mt-1 tracking-tight">{formatCurrency(value)}</h4>
      </div>
      {/* Abstract Background Decoration */}
      <div className={cn("absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-10",
        title === 'Receitas' ? 'bg-green-500' : title === 'Despesas' ? 'bg-red-500' : 'bg-blue-500')}
      />
    </GlassCard>
  );

  return (
    <div className="space-y-4 w-full">
      {/* Header com Período */}
      {summary.period && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDate(summary.period.start)} - {formatDate(summary.period.end)}
          </span>
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <MetricCard
            title="Receitas"
            value={income}
            icon={TrendingUp}
            color="text-green-400"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <MetricCard
            title="Despesas"
            value={expenses}
            icon={TrendingDown}
            color="text-red-400"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <MetricCard
            title="Saldo Líquido"
            value={balance}
            icon={Wallet}
            color={balance >= 0 ? "text-primary" : "text-red-400"}
            className={balance >= 0 ? "border-primary/20" : "border-red-500/20"}
          />
        </motion.div>
      </div>

      {/* Gráfico (se houver dados) */}
      {summary.series && summary.series.length > 0 && (
        <ChartComponent
          data={summary.series}
          type="area"
          title="Fluxo de Caixa do Período"
          dataKeys={[
            { key: 'income', color: '#4ade80', name: 'Receitas' }, // green-400
            { key: 'expense', color: '#f87171', name: 'Despesas' } // red-400
          ]}
          height={200}
        />
      )}

      {/* Se não houver gráfico, mostrar contagem */}
      {(!summary.series || summary.series.length === 0) && summary.transaction_count !== undefined && (
        <div className="text-center py-2 text-xs text-muted-foreground w-full">
          {summary.transaction_count} transações processadas no período
        </div>
      )}
    </div>
  );
};

export default FinancialCard;
