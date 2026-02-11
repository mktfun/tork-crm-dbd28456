import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Loader2, Calendar, Paperclip, X, Upload, Clock } from 'lucide-react';
import { format, isFuture, parseISO } from 'date-fns';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
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

import { supabase } from '@/integrations/supabase/client';
import { useFinancialAccounts, useCreateFinancialMovement } from '@/hooks/useFinanceiro';
import { useBankAccounts } from '@/hooks/useBancos';
import { useSupabaseRamos } from '@/hooks/useSupabaseRamos';
import { useSupabaseCompanies } from '@/hooks/useSupabaseCompanies';
import { useSupabaseProducers } from '@/hooks/useSupabaseProducers';
import { FinancialAccount } from '@/types/financeiro';
import { Badge } from '@/components/ui/badge';

interface FormData {
  description: string;
  amount: string;
  transactionDate: string;
  expenseAccountId: string;
  bankAccountId?: string;
  referenceNumber: string;
  ramoId?: string;
  insuranceCompanyId?: string;
  producerId?: string;
}

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
  const { data: assetAccounts = [] } = useFinancialAccounts('asset'); // Para uso interno
  const { data: bankSummary } = useBankAccounts();
  const { data: ramos = [] } = useSupabaseRamos();
  const { companies = [] } = useSupabaseCompanies(); // Hook has slightly different signature
  const { producers = [] } = useSupabaseProducers(); // Hook has slightly different signature

  const banks = bankSummary?.accounts?.filter(b => b.isActive) || [];

  const { mutate: createMovement, isPending: isCreating } = useCreateFinancialMovement();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
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

    // Preview para imagens
    if (file.type.startsWith('image/')) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview(null);
    }
  };

  // Remover arquivo
  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Detectar se a data selecionada é futura
  const transactionDate = watch('transactionDate');
  const isDateFuture = useMemo(() => {
    if (!transactionDate) return false;
    try {
      return isFuture(parseISO(transactionDate));
    } catch {
      return false;
    }
  }, [transactionDate]);

  const onSubmit = async (data: FormData) => {
    try {
      const amount = parseFloat(data.amount.replace(',', '.'));

      if (isNaN(amount) || amount <= 0) {
        toast.error('Valor inválido');
        return;
      }

      let attachmentUrl: string | undefined;

      // Upload do comprovante se houver
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
          // Continua sem o anexo
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
        memo: attachmentUrl, // Usando memo para a URL do anexo por enquanto, ou conforme lógica original
        is_confirmed: isPaid,
        ramo_id: data.ramoId,
        insurance_company_id: data.insuranceCompanyId,
        producer_id: data.producerId
      }, {
        onSuccess: () => {
          toast.success('Despesa registrada com sucesso!');
          reset();
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

  const isLoading = loadingExpense;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Despesa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-4">
          {/* Descrição - Full Width */}
          <div className="space-y-1">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Ex: Pagamento de conta de luz"
              className="resize-none"
              rows={2}
              {...register('description', { required: 'Descrição obrigatória' })}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Valor e Data - Side by Side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                {...register('amount', { required: 'Valor obrigatório' })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="transactionDate">Data *</Label>
                {isDateFuture && (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30 bg-amber-500/10 h-5 px-1.5 text-[10px]">
                    <Calendar className="w-3 h-3" />
                    Previsão
                  </Badge>
                )}
              </div>
              <Input
                id="transactionDate"
                type="date"
                {...register('transactionDate', { required: 'Data obrigatória' })}
              />
              {/* Future date warning removed to save space, relying on Badge above */}
              {errors.transactionDate && (
                <p className="text-sm text-destructive">{errors.transactionDate.message}</p>
              )}
            </div>
          </div>

          {/* Checkbox: Já paga? - Compact */}
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted/30 border border-border/50">
            <Checkbox
              id="isPaid"
              checked={isPaid}
              onCheckedChange={(checked) => setIsPaid(!!checked)}
            />
            <div className="flex-1 flex items-center justify-between">
              <Label htmlFor="isPaid" className="text-sm font-medium cursor-pointer">
                Despesa já foi paga
              </Label>
              {!isPaid && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  A Pagar
                </span>
              )}
            </div>
          </div>

          {/* Categoria - Full Width */}
          <div className="space-y-1">
            <Label>Para que foi? (Categoria) *</Label>
            <Select
              onValueChange={(value) => setValue('expenseAccountId', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {expenseAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.code ? `${acc.code} - ${acc.name}` : acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register('expenseAccountId', { required: 'Selecione uma categoria' })} />
            {errors.expenseAccountId && (
              <p className="text-sm text-destructive">{errors.expenseAccountId.message}</p>
            )}
          </div>

          {/* Banco e Referência - 2 Cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Banco <span className="text-xs text-muted-foreground/80 font-normal">(Opcional)</span></Label>
              <Select
                onValueChange={(value) => setValue('bankAccountId', value === 'none' ? '' : value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
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
            </div>

            <div className="space-y-1">
              <Label htmlFor="referenceNumber">Referência <span className="text-xs text-muted-foreground/80 font-normal">(opcional)</span></Label>
              <Input
                id="referenceNumber"
                placeholder="Ex: NF 12345"
                {...register('referenceNumber')}
              />
            </div>
          </div>

          {/* Metadata - 3 Cols */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Ramo <span className="text-xs text-muted-foreground/80 font-normal">(Op)</span></Label>
              <Select
                onValueChange={(value) => setValue('ramoId', value === 'none' ? '' : value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {ramos.map((ramo) => (
                    <SelectItem key={ramo.id} value={ramo.id}>
                      {ramo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Seguradora <span className="text-xs text-muted-foreground/80 font-normal">(Op)</span></Label>
              <Select
                onValueChange={(value) => setValue('insuranceCompanyId', value === 'none' ? '' : value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Produtor <span className="text-xs text-muted-foreground/80 font-normal">(Op)</span></Label>
              <Select
                onValueChange={(value) => setValue('producerId', value === 'none' ? '' : value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {producers.map((producer) => (
                    <SelectItem key={producer.id} value={producer.id}>
                      {producer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Anexar Comprovante - Compact */}
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm">
              <Paperclip className="w-3 h-3" />
              Anexar Comprovante <span className="text-xs text-muted-foreground/80 font-normal">(opcional)</span>
            </Label>

            {!attachmentFile ? (
              <div
                className="border border-dashed border-border/50 rounded-lg h-14 flex items-center justify-center gap-2 hover:border-primary/50 transition-colors cursor-pointer bg-muted/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Clique para anexar (PDF ou Imagem)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border/30 h-14">
                {attachmentPreview ? (
                  <img
                    src={attachmentPreview}
                    alt="Preview"
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{attachmentFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(attachmentFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeAttachment}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUploading}
            >
              {(isCreating || isUploading) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploading ? 'Anexando...' : 'Salvando...'}
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
