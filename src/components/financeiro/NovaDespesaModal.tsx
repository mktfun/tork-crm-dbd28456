import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrendingDown, Loader2, Calendar, Paperclip, X, Upload, Clock, Landmark, Building2, User, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, isFuture, parseISO } from 'date-fns';
import { toast } from 'sonner';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

import { supabase } from '@/integrations/supabase/client';
import { useFinancialAccounts, useCreateFinancialMovement } from '@/hooks/useFinanceiro';
import { useBankAccounts } from '@/hooks/useBancos';
import { useSupabaseRamos } from '@/hooks/useSupabaseRamos';
import { useSupabaseCompanies } from '@/hooks/useSupabaseCompanies';
import { useSupabaseProducers } from '@/hooks/useSupabaseProducers';
import { cn } from '@/lib/utils';

const despesaSchema = z.object({
  description: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres'),
  amount: z.string().min(1, 'Valor obrigatório'),
  transactionDate: z.string().min(1, 'Data é obrigatória'),
  expenseAccountId: z.string().min(1, 'Selecione uma categoria'),
  bankAccountId: z.string().optional(),
  referenceNumber: z.string().optional(),
  ramoId: z.string().optional(),
  insuranceCompanyId: z.string().optional(),
  producerId: z.string().optional(),
});

type DespesaFormData = z.infer<typeof despesaSchema>;

// Gerar ID único
function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function NovaDespesaModal() {
  const [open, setOpen] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: expenseAccounts = [], isLoading: loadingExpense } = useFinancialAccounts('expense');
  const { data: bankSummary } = useBankAccounts();
  const { data: ramos = [] } = useSupabaseRamos();
  const { companies = [] } = useSupabaseCompanies();
  const { producers = [] } = useSupabaseProducers();

  const flattenedExpenseAccounts = useMemo(() => {
    const accountMap = new Map();
    expenseAccounts.forEach(a => accountMap.set(a.id, { ...a, children: [] }));
    const roots: any[] = [];
    expenseAccounts.forEach(a => {
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
  }, [expenseAccounts]);

  const banks = bankSummary?.accounts?.filter(b => b.isActive) || [];

  const { mutate: createMovement, isPending: isCreating } = useCreateFinancialMovement();

  const form = useForm<DespesaFormData>({
    resolver: zodResolver(despesaSchema),
    defaultValues: {
      description: '',
      amount: '',
      transactionDate: format(new Date(), 'yyyy-MM-dd'),
      expenseAccountId: '',
      bankAccountId: '',
      referenceNumber: '',
      ramoId: '',
      insuranceCompanyId: '',
      producerId: ''
    }
  });

  // Handler para seleção de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Selecione uma imagem ou PDF');
      return;
    }

    setAttachmentFile(file);
    if (file.type.startsWith('image/')) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const transactionDate = form.watch('transactionDate');
  const isDateFuture = useMemo(() => {
    if (!transactionDate) return false;
    try {
      return isFuture(parseISO(transactionDate));
    } catch {
      return false;
    }
  }, [transactionDate]);

  const onSubmit = async (data: DespesaFormData) => {
    try {
      const amount = parseFloat(data.amount.replace(',', '.'));

      if (isNaN(amount) || amount <= 0) {
        toast.error('Valor inválido');
        return;
      }

      let attachmentUrl: string | undefined;

      if (attachmentFile) {
        setIsUploading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Usuário não autenticado');

          const ext = attachmentFile.name.split('.').pop() || 'jpg';
          const fileName = `${user.id}/${generateId()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('comprovantes')
            .upload(fileName, attachmentFile, { contentType: attachmentFile.type });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('comprovantes')
            .getPublicUrl(fileName);

          attachmentUrl = urlData.publicUrl;
        } catch (uploadErr) {
          console.error('Erro no upload:', uploadErr);
          toast.error('Erro ao anexar comprovante');
        } finally {
          setIsUploading(false);
        }
      }

      createMovement({
        description: data.description,
        amount: amount,
        account_id: data.expenseAccountId,
        bank_account_id: data.bankAccountId && data.bankAccountId !== 'none' ? data.bankAccountId : undefined,
        payment_date: data.transactionDate,
        type: 'expense',
        reference_number: data.referenceNumber || undefined,
        memo: attachmentUrl,
        is_confirmed: isPaid,
        ramo_id: data.ramoId && data.ramoId !== 'none' ? data.ramoId : undefined,
        insurance_company_id: data.insuranceCompanyId && data.insuranceCompanyId !== 'none' ? data.insuranceCompanyId : undefined,
        producer_id: data.producerId && data.producerId !== 'none' ? data.producerId : undefined
      }, {
        onSuccess: () => {
          toast.success('Despesa registrada com sucesso!');
          form.reset();
          removeAttachment();
          setOpen(false);
        },
        onError: (error: any) => {
          console.error('Erro ao registrar despesa:', error);
          toast.error(error.message || 'Erro ao registrar despesa');
        }
      });
    } catch (error: any) {
      console.error('Erro ao processar formulário:', error);
      toast.error(error.message || 'Erro ao processar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 font-bold">
          <TrendingDown className="w-4 h-4" />
          Nova Despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <div className="bg-rose-600 p-6 flex items-center gap-4 text-white">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Registrar Despesa</DialogTitle>
            <DialogDescription className="text-rose-100/80 font-medium">
              Lançamento manual de débito no sistema financeiro
            </DialogDescription>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            
            {/* Status Switcher - Liquid Glass Style */}
            <div className="flex flex-row items-center justify-between rounded-2xl bg-rose-500/5 border border-rose-500/10 p-4 shadow-inner">
              <div className="space-y-0.5">
                <Label className="text-sm font-black text-rose-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> STATUS: {isPaid ? 'PAGO' : 'PENDENTE'}
                </Label>
                <p className="text-xs font-medium text-rose-600/60">
                  {isPaid ? 'A despesa já foi liquidada.' : 'A despesa aparecerá como "A Pagar".'}
                </p>
              </div>
              <Switch
                checked={isPaid}
                onCheckedChange={setIsPaid}
                className="data-[state=checked]:bg-rose-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Descrição Principal */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">O que foi pago?</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Aluguel, Internet, etc." 
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
                          placeholder="0,00"
                          className="pl-10 bg-muted/30 border-muted/50 focus:bg-background transition-all font-black text-rose-600 text-lg"
                          {...field}
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
                    <div className="flex items-center gap-2 mb-2">
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data</FormLabel>
                      {isDateFuture && (
                        <Badge variant="outline" className="h-4 text-[9px] font-black uppercase bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Previsão
                        </Badge>
                      )}
                    </div>
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
                name="expenseAccountId"
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
                        {flattenedExpenseAccounts.map((account) => (
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
                      <Landmark className="w-3 h-3" /> Conta de Saída
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

            {/* Anexar Comprovante */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Paperclip className="w-4 h-4" /> Anexar Comprovante
              </Label>

              {!attachmentFile ? (
                <div
                  className="border-2 border-dashed border-muted/50 rounded-2xl p-6 text-center hover:border-rose-500/50 hover:bg-rose-500/5 transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground group-hover:text-rose-500 transition-colors" />
                  <p className="text-sm font-bold text-muted-foreground group-hover:text-rose-500">Clique para selecionar imagem ou PDF</p>
                  <p className="text-[10px] text-muted-foreground/60">Arraste seu comprovante aqui</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-muted/50 relative overflow-hidden group">
                  {attachmentPreview ? (
                    <img src={attachmentPreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover shadow-md" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center border border-muted/30">
                      <Paperclip className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{attachmentFile.name}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      {(attachmentFile.size / 1024).toFixed(1)} KB • {attachmentFile.type.split('/')[1]}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeAttachment}
                    className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Botões - Liquid Glass */}
            <div className="flex justify-end gap-3 pt-4 border-t border-muted/50">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="font-bold text-muted-foreground hover:text-foreground">
                Descartar
              </Button>
              <Button
                type="submit"
                className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-black px-8 rounded-xl shadow-lg shadow-rose-600/20"
                disabled={isCreating || isUploading}
              >
                {isCreating || isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isUploading ? 'ANEXANDO...' : 'SALVANDO...'}
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    CONFIRMAR DESPESA
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
