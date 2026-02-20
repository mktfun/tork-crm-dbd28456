import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { format, addYears, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupabasePolicies } from '@/hooks/useSupabasePolicies';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Policy } from '@/types';
import { formatDate, parseLocalDate } from '@/utils/dateUtils';

const renewalSchema = z.object({
  newPremiumValue: z.number().min(0.01, 'Valor do prêmio deve ser maior que zero'),
  newCommissionRate: z.number().min(0, 'Taxa de comissão deve ser maior ou igual a zero').max(100, 'Taxa de comissão não pode ser maior que 100%'),
  bonusClass: z.string().optional(),
  newExpirationDate: z.string().min(1, 'Nova data de vencimento é obrigatória'),
  newPolicyNumber: z.string().optional(),
  observations: z.string().optional(),
  renewalType: z.enum(['manual', 'auto_12m', 'auto_24m'], {
    message: 'Tipo de renovação é obrigatório'
  })
}).refine((data) => {
  const newDate = new Date(data.newExpirationDate);
  const today = new Date();
  return isAfter(newDate, today);
}, {
  message: 'A nova data de vencimento deve ser posterior à data atual',
  path: ['newExpirationDate']
});

type RenewalFormData = z.infer<typeof renewalSchema>;

interface RenewPolicyModalProps {
  policy: Policy | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RenewPolicyModal({ policy, isOpen, onClose, onSuccess }: RenewPolicyModalProps) {
  const [isRenewing, setIsRenewing] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const { updatePolicy } = useSupabasePolicies();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<RenewalFormData>({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      newPremiumValue: policy?.premiumValue || 0,
      newCommissionRate: policy?.commissionRate || 0,
      bonusClass: policy?.bonus_class || '0',
      renewalType: 'manual'
    }
  });

  const renewalType = watch('renewalType');

  const calculateNewExpirationDate = (type: string) => {
    if (!policy?.expirationDate) return '';
    const currentExpiration = parseLocalDate(policy.expirationDate);
    let newDate: Date;
    switch (type) {
      case 'auto_12m':
        newDate = addYears(currentExpiration, 1);
        break;
      case 'auto_24m':
        newDate = addYears(currentExpiration, 2);
        break;
      default:
        newDate = addYears(currentExpiration, 1);
    }
    return format(newDate, 'yyyy-MM-dd');
  };

  const handleRenewalTypeChange = (type: string) => {
    setValue('renewalType', type as any);
    const newDate = calculateNewExpirationDate(type);
    setValue('newExpirationDate', newDate);
    if (newDate) {
      setExpirationDate(new Date(newDate + 'T12:00:00'));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setExpirationDate(date);
    if (date) {
      setValue('newExpirationDate', format(date, 'yyyy-MM-dd'));
    }
  };

  const onSubmit = async (data: RenewalFormData) => {
    if (!policy || !user) return;

    setIsRenewing(true);
    try {
      // 1. Save renewal history snapshot
      const { error: historyError } = await supabase.from('policy_renewal_history').insert({
        policy_id: policy.id,
        user_id: user.id,
        previous_expiration_date: policy.expirationDate,
        previous_premium_value: policy.premiumValue,
        previous_commission_rate: policy.commissionRate,
        previous_bonus_class: policy.bonus_class || null,
        previous_policy_number: policy.policyNumber || null,
        new_expiration_date: data.newExpirationDate,
        new_premium_value: data.newPremiumValue,
        new_commission_rate: data.newCommissionRate,
        new_bonus_class: data.bonusClass || null,
        new_policy_number: data.newPolicyNumber || policy.policyNumber || null,
        renewal_type: data.renewalType,
        observations: data.observations || null,
      });

      if (historyError) throw historyError;

      // 2. Update existing policy in-place
      await updatePolicy(policy.id, {
        expirationDate: data.newExpirationDate,
        premiumValue: data.newPremiumValue,
        commissionRate: data.newCommissionRate,
        bonus_class: data.bonusClass,
        ...(data.newPolicyNumber ? { policyNumber: data.newPolicyNumber } : {}),
        renewalStatus: 'Renovada',
        status: 'Ativa',
      });

      toast({
        title: 'Renovação concluída',
        description: `Apólice ${policy.policyNumber} renovada com sucesso até ${format(new Date(data.newExpirationDate + 'T12:00:00'), 'dd/MM/yyyy')}.`,
      });

      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Erro na renovação:', error);
      toast({
        title: 'Erro na renovação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsRenewing(false);
    }
  };

  if (!policy) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <RotateCcw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Renovar Apólice</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {policy.policyNumber} · {(policy as any).clientName || 'Cliente'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Policy Summary */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Situação Atual</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Vencimento atual</span>
                <p className="text-foreground font-medium">{formatDate(policy.expirationDate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Prêmio atual</span>
                <p className="text-foreground font-medium">
                  {policy.premiumValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Comissão atual</span>
                <p className="text-foreground font-medium">{policy.commissionRate}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Classe de bônus atual</span>
                <p className="text-foreground font-medium">Classe {policy.bonus_class || '0'}</p>
              </div>
            </div>
          </div>

          {/* Renewal Type */}
          <div>
            <Label>Tipo de Renovação</Label>
            <Select value={renewalType} onValueChange={handleRenewalTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (Personalizada)</SelectItem>
                <SelectItem value="auto_12m">Automática - 12 meses</SelectItem>
                <SelectItem value="auto_24m">Automática - 24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* New Policy Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Novo Valor do Prêmio *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('newPremiumValue', { valueAsNumber: true })}
                placeholder="0,00"
              />
              {errors.newPremiumValue && (
                <p className="text-destructive text-xs mt-1">{errors.newPremiumValue.message}</p>
              )}
            </div>

            <div>
              <Label>Nova Taxa de Comissão (%) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('newCommissionRate', { valueAsNumber: true })}
                placeholder="0,00"
              />
              {errors.newCommissionRate && (
                <p className="text-destructive text-xs mt-1">{errors.newCommissionRate.message}</p>
              )}
            </div>

            <div>
              <Label>Classe de Bônus</Label>
              <Select value={watch('bonusClass')} onValueChange={(value) => setValue('bonusClass', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Classe 0 (Padrão)</SelectItem>
                  <SelectItem value="1">Classe 1 (-10%)</SelectItem>
                  <SelectItem value="2">Classe 2 (-20%)</SelectItem>
                  <SelectItem value="3">Classe 3 (-30%)</SelectItem>
                  <SelectItem value="4">Classe 4 (-40%)</SelectItem>
                  <SelectItem value="5">Classe 5 (-50%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nova Data de Vencimento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expirationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate
                      ? format(expirationDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={handleDateSelect}
                    locale={ptBR}
                    initialFocus
                    disabled={(date) => date <= new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {errors.newExpirationDate && (
                <p className="text-destructive text-xs mt-1">{errors.newExpirationDate.message}</p>
              )}
            </div>
          </div>

          {/* Optional new policy number */}
          <div>
            <Label>
              Número da Nova Apólice{' '}
              <span className="text-muted-foreground font-normal">(opcional — se a seguradora emitir novo número)</span>
            </Label>
            <Input
              {...register('newPolicyNumber')}
              placeholder={policy.policyNumber || 'Manter número atual'}
            />
          </div>

          {/* Observations */}
          <div>
            <Label>Observações da Renovação</Label>
            <Textarea
              {...register('observations')}
              placeholder="Observações sobre a renovação..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isRenewing}>
              {isRenewing ? 'Renovando...' : 'Confirmar Renovação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
