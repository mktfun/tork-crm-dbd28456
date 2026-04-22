import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, TrendingDown, TrendingUp, Landmark, Layers, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useCreateAccount, useUpdateAccount, useFinancialAccountsWithDefaults } from '@/hooks/useFinanceiro';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinancialAccount, FinancialAccountType, ACCOUNT_TYPE_LABELS } from '@/types/financeiro';

interface FormData {
  name: string;
  code: string;
  description: string;
  parentId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: FinancialAccount | null;
  accountType: FinancialAccountType;
}

export function AccountFormModal({ open, onOpenChange, account, accountType }: Props) {
  const isEditing = !!account;
  
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  
  const { data: allAccounts = [] } = useFinancialAccountsWithDefaults();
  const parentCandidates = allAccounts.filter(a => a.type === accountType && a.id !== account?.id);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      parentId: 'none'
    }
  });

  const parentIdValue = watch('parentId');
  const nameValue = watch('name');

  // Reset form quando o modal abrir/fechar ou mudar conta
  useEffect(() => {
    if (open && account) {
      reset({
        name: account.name,
        code: account.code || '',
        description: account.description || '',
        parentId: account.parentId || 'none'
      });
    } else if (open) {
      reset({ name: '', code: '', description: '', parentId: 'none' });
    }
  }, [open, account, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const finalParentId = data.parentId === 'none' ? null : data.parentId;
      if (isEditing && account) {
        await updateAccount.mutateAsync({
          accountId: account.id,
          updates: {
            name: data.name,
            code: data.code || undefined,
            description: data.description || undefined,
            parentId: finalParentId
          }
        });
        toast.success('Conta atualizada com sucesso!');
      } else {
        await createAccount.mutateAsync({
          name: data.name,
          type: accountType,
          code: data.code || undefined,
          description: data.description || undefined,
          parentId: finalParentId || undefined
        });
        toast.success('Conta criada com sucesso!');
      }
      
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      toast.error(error.message || 'Erro ao salvar conta');
    }
  };

  const isPending = createAccount.isPending || updateAccount.isPending;
  
  const typeLabel = accountType === 'asset' 
    ? 'Conta Bancária' 
    : accountType === 'expense' 
      ? 'Categoria de Despesa' 
      : 'Categoria de Receita';

  const TypeBadge = () => {
    if (accountType === 'asset') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
        <Landmark className="w-3 h-3" /> Banco
      </span>
    );
    if (accountType === 'expense') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
        <TrendingDown className="w-3 h-3" /> Despesa
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        <TrendingUp className="w-3 h-3" /> Receita
      </span>
    );
  };

  const selectedParent = parentIdValue !== 'none' ? parentCandidates.find(p => p.id === parentIdValue) : null;
  const dialogTitle = isEditing ? `Editar ${typeLabel}` : selectedParent ? `Nova Subcategoria` : `Nova ${typeLabel}`;
  const dialogDesc = isEditing
    ? 'Altere os dados da conta abaixo.'
    : selectedParent
      ? `Será criada como subcategoria de: ${selectedParent.name}`
      : `Preencha os dados para criar uma nova ${typeLabel.toLowerCase()}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{dialogTitle}</DialogTitle>
            <TypeBadge />
          </div>
          <DialogDescription>{dialogDesc}</DialogDescription>
        </DialogHeader>

        {selectedParent && !isEditing && (
          <div className="flex items-center gap-1.5 p-3 rounded-lg bg-muted/40 text-sm mt-2 border border-border/50">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground font-medium truncate max-w-[150px]">{selectedParent.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span className="font-semibold truncate flex-1 text-primary">
              {nameValue || 'Nova Subcategoria'}
            </span>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder={accountType === 'asset' ? 'Ex: Banco Itaú' : 'Ex: Marketing Digital'}
              {...register('name', { required: 'Nome obrigatório' })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Código (opcional)</Label>
            <Input
              id="code"
              placeholder="Ex: 1.1.01"
              {...register('code')}
            />
            <p className="text-xs text-muted-foreground">
              Código para organização do plano de contas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descrição adicional..."
              rows={2}
              {...register('description')}
            />
          </div>

          {(accountType === 'expense' || accountType === 'revenue') && (
            <div className="space-y-2">
              <Label>Categoria Mãe (opcional)</Label>
              <Select value={parentIdValue || 'none'} onValueChange={(val) => setValue('parentId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria mãe" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border shadow-lg max-h-[200px]">
                  <SelectItem value="none">Nenhuma (Categoria Principal)</SelectItem>
                  {parentCandidates.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecione para criar uma subcategoria
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                'Atualizar'
              ) : (
                'Criar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
