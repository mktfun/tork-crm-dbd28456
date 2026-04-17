import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TrendingUp, Loader2, Calendar, Info, Building2, User, Tag, CheckCircle2, Landmark } from 'lucide-react';

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

import { useFinancialAccountsWithDefaults } from '@/hooks/useFinanceiro';
import { useBankAccounts } from '@/hooks/useBancos';
import { useSupabaseRamos } from '@/hooks/useSupabaseRamos';
import { useSupabaseCompanies } from '@/hooks/useSupabaseCompanies';
import { useSupabaseProducers } from '@/hooks/useSupabaseProducers';
import { registerRevenue } from '@/services/financialService';
import { cn } from '@/lib/utils';

const revenueSchema = z.object({
  description: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres'),
  amount: z.number().positive('Valor deve ser positivo'),
  transactionDate: z.string().min(1, 'Data é obrigatória'),
  revenueAccountId: z.string().min(1, 'Selecione uma categoria'),
  bankAccountId: z.string().optional(),
  referenceNumber: z.string().optional(),
  memo: z.string().optional(),
  isConfirmed: z.boolean(),
  ramoId: z.string().optional(),
  insuranceCompanyId: z.string().optional(),
  producerId: z.string().optional(),
});

type RevenueFormData = z.infer<typeof revenueSchema>;

interface NovaReceitaModalProps {
  trigger?: React.ReactNode;
}

export function NovaReceitaModal({ trigger }: NovaReceitaModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: accounts = [], isLoading: loadingAccounts } = useFinancialAccountsWithDefaults();
  const { data: bankSummary } = useBankAccounts();
  const { data: ramos = [] } = useSupabaseRamos();
  const { companies = [] } = useSupabaseCompanies();
  const { producers = [] } = useSupabaseProducers();

  // Filtrar contas por tipo - apenas categorias de receita
  const revenueAccounts = accounts.filter(a => a.type === 'revenue');

  const flattenedRevenueAccounts = useMemo(() => {
    const accountMap = new Map();
    revenueAccounts.forEach(a => accountMap.set(a.id, { ...a, children: [] }));
    const roots: any[] = [];
    revenueAccounts.forEach(a => {
      if (a.parentId && accountMap.has(a.parentId)) {
        accountMap.get(a.parentId).children.push(accountMap.get(a.id));
      } else {
        roots.push(accountMap.get(a.id));
      }
    });

    const flatten = (nodes: any[], level = 0): any[] => {
      let result: any[] = [];
      nodes.forEach(node => {
        result.push({ ...node, level });
        if (node.children.length > 0) {
          result = result.concat(flatten(node.children, level + 1));
        }
      });
      return result;
    };

    return flatten(roots);
  }, [revenueAccounts]);

  const banks = bankSummary?.accounts?.filter(b => b.isActive) || [];

  const form = useForm<RevenueFormData>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      description: '',
      amount: 0,
      transactionDate: format(new Date(), 'yyyy-MM-dd'),
      revenueAccountId: '',
      bankAccountId: '',
      referenceNumber: '',
      memo: '',
      isConfirmed: true,
      ramoId: '',
      insuranceCompanyId: '',
      producerId: '',
    }
  });

  const onSubmit = async (data: RevenueFormData) => {
    setIsSubmitting(true);
    try {
      // Buscar conta padrão de "Comissões a Receber" para provisões
      const defaultAssetAccount = accounts.find(a =>
        a.type === 'asset' && a.name.toLowerCase().includes('comiss')
      ) || accounts.find(a => a.type === 'asset');

      if (!defaultAssetAccount) {
        throw new Error('Conta de ativo padrão não encontrada');
      }

      await registerRevenue({
        description: data.description,
        amount: data.amount,
        transactionDate: data.transactionDate,
        revenueAccountId: data.revenueAccountId,
        assetAccountId: defaultAssetAccount.id, // Usa conta padrão para ledger
        bankAccountId: data.bankAccountId && data.bankAccountId !== 'none' ? data.bankAccountId : undefined,
        referenceNumber: data.referenceNumber,
        memo: data.memo,
        isConfirmed: data.isConfirmed,
        ramoId: data.ramoId,
        insuranceCompanyId: data.insuranceCompanyId,
        producerId: data.producerId,
      });

      toast.success('Receita registrada com sucesso!');
      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Erro ao registrar receita:', error);
      toast.error(error.message || 'Erro ao registrar receita');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 font-bold">
            <TrendingUp className="w-4 h-4" />
            Nova Receita
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <div className="bg-emerald-600 p-6 flex items-center gap-4 text-white">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Registrar Receita</DialogTitle>
            <DialogDescription className="text-emerald-100/80 font-medium">
              Lançamento manual de crédito no sistema financeiro
            </DialogDescription>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            
            {/* Status Switcher - Liquid Glass Style */}
            <FormField
              control={form.control}
              name="isConfirmed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-4 shadow-inner">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-black text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> STATUS: {field.value ? 'RECEBIDO' : 'PENDENTE'}
                    </FormLabel>
                    <FormDescription className="text-xs font-medium text-emerald-600/60">
                      O valor já foi conciliado ou está disponível na conta?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Descrição Principal */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descrição do Lançamento</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Comissão extraordinária Porto Seguro" 
                          className="bg-muted/30 border-muted/50 focus:bg-background transition-all font-semibold"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Valor e Data */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Valor (R$)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          className="pl-10 bg-muted/30 border-muted/50 focus:bg-background transition-all font-black text-emerald-600 text-lg"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data do Lançamento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="date" className="pl-10 bg-muted/30 border-muted/50 focus:bg-background transition-all font-semibold" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              {/* Categoria e Banco */}
              <FormField
                control={form.control}
                name="revenueAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Tag className="w-3 h-3" /> Categoria
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30 border-muted/50 font-semibold">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {flattenedRevenueAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id} className="font-medium p-0">
                            <div className="flex items-center w-full py-1.5 pr-2" style={{ paddingLeft: `${(account.level * 1.5) + 0.5}rem` }}>
                              {account.level > 0 && <span className="text-muted-foreground ml-1 mr-1">↳</span>}
                              {account.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Landmark className="w-3 h-3" /> Conta Destino
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30 border-muted/50 font-semibold">
                          <SelectValue placeholder="Selecione o banco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum banco</SelectItem>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id} className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{bank.icon}</span>
                              <span>{bank.bankName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="bg-muted/50" />

            {/* Campos de Contexto (Opcionais) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="ramoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Ramo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/10 border-muted/30 text-xs font-bold h-8">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {ramos.map((ramo) => (
                          <SelectItem key={ramo.id} value={ramo.id} className="text-xs">{ramo.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insuranceCompanyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                      <Building2 className="w-2.5 h-2.5" /> Seguradora
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/10 border-muted/30 text-xs font-bold h-8">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id} className="text-xs">{company.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="producerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" /> Produtor
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/10 border-muted/30 text-xs font-bold h-8">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {producers.map((producer) => (
                          <SelectItem key={producer.id} value={producer.id} className="text-xs">{producer.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Referência e Notas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nº Documento / Referência</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: NF-12345" className="bg-muted/20 border-muted/30 text-xs font-semibold" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Observações Internas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas adicionais sobre esta receita..."
                        className="resize-none bg-muted/20 border-muted/30 text-xs font-medium"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Botões - Liquid Glass */}
            <div className="flex justify-end gap-3 pt-4 border-t border-muted/50">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="font-bold text-muted-foreground hover:text-foreground">
                Descartar
              </Button>
              <Button
                type="submit"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 rounded-xl shadow-lg shadow-emerald-600/20"
                disabled={isSubmitting || loadingAccounts}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    SALVANDO...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    CONFIRMAR RECEITA
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
