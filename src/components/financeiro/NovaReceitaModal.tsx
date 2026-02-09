import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TrendingUp, Loader2, Calendar } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { useFinancialAccountsWithDefaults, useRegisterRevenue } from '@/hooks/useFinanceiro';
import { useBankAccounts } from '@/hooks/useBancos';

const revenueSchema = z.object({
  description: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres'),
  amount: z.number().positive('Valor deve ser positivo'),
  transactionDate: z.string().min(1, 'Data é obrigatória'),
  revenueAccountId: z.string().min(1, 'Selecione uma categoria'),
  assetAccountId: z.string().optional(),
  bankAccountId: z.string().optional(),
  referenceNumber: z.string().optional(),
  memo: z.string().optional(),
  isConfirmed: z.boolean(), // v0.1: Removed .default() - handled by form defaultValues
});

type RevenueFormData = z.infer<typeof revenueSchema>;

interface NovaReceitaModalProps {
  trigger?: React.ReactNode;
}

export function NovaReceitaModal({ trigger }: NovaReceitaModalProps) {
  const [open, setOpen] = useState(false);
  const { data: accounts = [], isLoading: loadingAccounts } = useFinancialAccountsWithDefaults();
  const { data: bankSummary } = useBankAccounts();
  const registerRevenue = useRegisterRevenue();

  // Filtrar contas por tipo
  const revenueAccounts = accounts.filter(a => a.type === 'revenue');
  const assetAccounts = accounts.filter(a => a.type === 'asset');
  const banks = bankSummary?.accounts?.filter(b => b.isActive) || [];

  const form = useForm<RevenueFormData>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      description: '',
      amount: 0,
      transactionDate: format(new Date(), 'yyyy-MM-dd'),
      revenueAccountId: '',
      assetAccountId: '',
      bankAccountId: '',
      referenceNumber: '',
      memo: '',
      isConfirmed: true,
    }
  });

  const onSubmit = async (data: RevenueFormData) => {
    try {
      await registerRevenue.mutateAsync({
        description: data.description,
        amount: data.amount,
        transactionDate: data.transactionDate,
        revenueAccountId: data.revenueAccountId,
        // Lógica de fallback para assetAccountId
        assetAccountId: (() => {
          if (data.assetAccountId) return data.assetAccountId;
          // Se selecionou banco mas não conta, tenta achar uma conta de ativo padrão (primeira disponível)
          if (data.bankAccountId && data.bankAccountId !== 'none' && assetAccounts.length > 0) {
            return assetAccounts[0].id;
          }
          // Se não tiver nada, throw para cair no catch
          throw new Error('Selecione uma conta de destino ou um banco.');
        })(),
        bankAccountId: data.bankAccountId || undefined,
        referenceNumber: data.referenceNumber,
        memo: data.memo,
        isConfirmed: data.isConfirmed,
      });

      toast.success('Receita registrada com sucesso!');
      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Erro ao registrar receita:', error);
      toast.error(error.message || 'Erro ao registrar receita');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Nova Receita
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Nova Receita Manual
          </DialogTitle>
          <DialogDescription>
            Registre uma receita avulsa no sistema financeiro
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="isConfirmed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mb-4">
                  <div className="space-y-0.5">
                    <FormLabel>Status: Recebido</FormLabel>
                    <DialogDescription>
                      A receita já entrou na conta?
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Comissão extraordinária Porto Seguro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor e Data */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Categoria de Receita */}
            <FormField
              control={form.control}
              name="revenueAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria de Receita</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {revenueAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conta de Destino (Ocultar se banco selecionado) */}
            {(!form.watch('bankAccountId') || form.watch('bankAccountId') === 'none') && (
              <FormField
                control={form.control}
                name="assetAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta de Destino</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Onde o dinheiro vai entrar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assetAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Banco (opcional) */}
            <FormField
              control={form.control}
              name="bankAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco / Onde entrou o dinheiro</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum banco</SelectItem>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Referência (opcional) */}
            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Referência (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: NF-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações (opcional) */}
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionais sobre esta receita"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={registerRevenue.isPending || loadingAccounts}
              >
                {registerRevenue.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Registrar Receita
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
