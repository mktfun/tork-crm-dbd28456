import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Repeat, Pencil, Trash2, MoreHorizontal, Home, Laptop, Briefcase,
  TrendingUp, TrendingDown, Pause, Play, CalendarDays
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { RecurringConfigModal } from './RecurringConfigModal';
import {
  useRecurringConfigs, useDeleteRecurringConfig, useUpdateRecurringConfig
} from '@/hooks/useRecurringConfigs';
import { RecurringConfig, FREQUENCY_LABELS } from '@/types/recurring';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getRecurringIcon(name: string) {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('aluguel') || nameLower.includes('casa') || nameLower.includes('imóvel')) return Home;
  if (nameLower.includes('software') || nameLower.includes('sistema') || nameLower.includes('assinatura')) return Laptop;
  if (nameLower.includes('prolabore') || nameLower.includes('salário') || nameLower.includes('honorário')) return Briefcase;
  return Repeat;
}

interface RecurringConfigCardProps {
  config: RecurringConfig;
  onEdit: (config: RecurringConfig) => void;
  onDelete: (id: string) => void;
  onToggleActive: (config: RecurringConfig) => void;
}

function RecurringConfigCard({ config, onEdit, onDelete, onToggleActive }: RecurringConfigCardProps) {
  const Icon = getRecurringIcon(config.name);
  const isExpense = config.nature === 'expense';

  return (
    <div className={cn(
      "p-4 rounded-lg border bg-card transition-all hover:shadow-md",
      !config.is_active && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-lg",
            isExpense ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{config.name}</h4>
              {!config.is_active && (
                <Badge variant="secondary" className="text-xs">
                  <Pause className="w-3 h-3 mr-1" /> Pausado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {FREQUENCY_LABELS[config.frequency]}
                {config.day_of_month && ` (dia ${config.day_of_month})`}
              </span>
            </div>
            {config.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{config.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-lg font-bold", isExpense ? "text-rose-500" : "text-emerald-500")}>
            {isExpense ? '-' : '+'}{formatCurrency(config.amount)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(config)}>
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(config)}>
                {config.is_active ? (<><Pause className="w-4 h-4 mr-2" /> Pausar</>) : (<><Play className="w-4 h-4 mr-2" /> Ativar</>)}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(config.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

interface RecurringConfigsListProps {
  type?: 'revenue' | 'expense' | 'all';
}

export function RecurringConfigsList({ type = 'all' }: RecurringConfigsListProps) {
  const { data: configs = [], isLoading } = useRecurringConfigs();
  const deleteMutation = useDeleteRecurringConfig();
  const updateMutation = useUpdateRecurringConfig();

  const [editingConfig, setEditingConfig] = useState<RecurringConfig | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (config: RecurringConfig) => {
    await updateMutation.mutateAsync({ id: config.id, is_active: !config.is_active });
  };

  const expenses = configs.filter(c => c.nature === 'expense' && (type === 'all' || type === 'expense'));
  const revenues = configs.filter(c => c.nature === 'revenue' && (type === 'all' || type === 'revenue'));

  const totalMonthlyExpense = expenses.filter(c => c.is_active && c.frequency === 'monthly').reduce((sum, c) => sum + c.amount, 0);
  const totalMonthlyRevenue = revenues.filter(c => c.is_active && c.frequency === 'monthly').reduce((sum, c) => sum + c.amount, 0);

  const getTitle = () => {
    if (type === 'revenue') return 'Receitas Recorrentes';
    if (type === 'expense') return 'Despesas Recorrentes';
    return 'Configurações Recorrentes';
  };

  const getDescription = () => {
    if (type === 'revenue') return 'Receitas que se repetem automaticamente';
    if (type === 'expense') return 'Despesas que se repetem automaticamente';
    return 'Despesas e receitas que se repetem automaticamente';
  };

  if (isLoading) {
    return (
      <div className="glass-component p-0 shadow-lg border-border bg-card">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Repeat className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{getTitle()}</h3>
          </div>
        </div>
        <div className="p-6 pt-0 space-y-3">
          {[1, 2, 3].map(i => (<Skeleton key={i} className="h-20 w-full" />))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-component p-0 shadow-lg border-border bg-card">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Repeat className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{getTitle()}</h3>
                <p className="text-sm text-muted-foreground">{getDescription()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {(totalMonthlyExpense > 0 || totalMonthlyRevenue > 0) && (
                <div className="flex items-center gap-4 text-sm">
                  {totalMonthlyRevenue > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-muted-foreground">Receita/mês:</span>
                      <span className="font-semibold text-emerald-500">{formatCurrency(totalMonthlyRevenue)}</span>
                    </div>
                  )}
                  {totalMonthlyExpense > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                      <span className="text-muted-foreground">Custo/mês:</span>
                      <span className="font-semibold text-rose-500">{formatCurrency(totalMonthlyExpense)}</span>
                    </div>
                  )}
                </div>
              )}
              <RecurringConfigModal />
            </div>
          </div>
        </div>
        <div className="p-6 pt-0">
          {configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Repeat className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-medium">Nenhuma configuração recorrente</p>
              <p className="text-sm mt-1">Adicione despesas fixas como aluguel, software ou prolabore</p>
            </div>
          ) : (
            <div className="space-y-6">
              {expenses.length > 0 && (
                <div className="space-y-3">
                  {type === 'all' && (
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-rose-500" /> Despesas Recorrentes ({expenses.length})
                    </h3>
                  )}
                  <div className="space-y-2">
                    {expenses.map(config => (
                      <RecurringConfigCard key={config.id} config={config} onEdit={setEditingConfig} onDelete={setDeleteId} onToggleActive={handleToggleActive} />
                    ))}
                  </div>
                </div>
              )}
              {revenues.length > 0 && (
                <div className="space-y-3">
                  {type === 'all' && (
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> Receitas Recorrentes ({revenues.length})
                    </h3>
                  )}
                  <div className="space-y-2">
                    {revenues.map(config => (
                      <RecurringConfigCard key={config.id} config={config} onEdit={setEditingConfig} onDelete={setDeleteId} onToggleActive={handleToggleActive} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editingConfig && (
        <RecurringConfigModal config={editingConfig} trigger={<span />} onSuccess={() => setEditingConfig(null)} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Configuração Recorrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A configuração será removida permanentemente e não aparecerá mais nas projeções.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
