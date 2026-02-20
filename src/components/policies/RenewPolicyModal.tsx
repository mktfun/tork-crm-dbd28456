import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { format, addMonths, addYears, parseISO } from 'date-fns';
import { useSupabasePolicies } from '@/hooks/useSupabasePolicies';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseCompanies } from '@/hooks/useSupabaseCompanies';
import { supabase } from '@/integrations/supabase/client';
import { Policy } from '@/types';
import { formatDate } from '@/utils/dateUtils';

const renewalSchema = z.object({
  newPremiumValue: z.number().min(0.01, 'Valor do prêmio deve ser maior que zero'),
  newCommissionRate: z.number().min(0, 'Taxa de comissão deve ser maior ou igual a zero').max(100, 'Taxa de comissão não pode ser maior que 100%'),
  bonusClass: z.string().optional(),
  insuranceCompanyId: z.string().optional(),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  manualExpirationDate: z.string().optional(),
  newPolicyNumber: z.string().optional(),
  observations: z.string().optional(),
  renewalType: z.enum(['manual', 'auto_6m', 'auto_12m', 'auto_24m'], {
    message: 'Tipo de renovação é obrigatório'
  })
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
  const { updatePolicy } = useSupabasePolicies();
  const { user } = useAuth();
  const { toast } = useToast();
  const { companies } = useSupabaseCompanies();

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
      bonusClass: String(Math.min(10, Number(policy?.bonus_class || '0') + 1)),
      insuranceCompanyId: policy?.insuranceCompany || '',
      newPolicyNumber: policy?.policyNumber || '',
      startDate: policy?.expirationDate || '',
      renewalType: 'auto_12m'
    }
  });

  const renewalType = watch('renewalType');
  const startDate = watch('startDate');

  const computedExpiration = useMemo(() => {
    if (!startDate) return null;
    try {
      const parsed = parseISO(startDate);
      if (isNaN(parsed.getTime())) return null;
      if (renewalType === 'auto_6m') return addMonths(parsed, 6);
      if (renewalType === 'auto_12m') return addMonths(parsed, 12);
      if (renewalType === 'auto_24m') return addYears(parsed, 2);
      return null; // manual
    } catch {
      return null;
    }
  }, [startDate, renewalType]);

  const onSubmit = async (data: RenewalFormData) => {
    if (!policy || !user) return;

    const finalExpiration = computedExpiration
      ? format(computedExpiration, 'yyyy-MM-dd')
      : data.manualExpirationDate;

    if (!finalExpiration) {
      toast({ title: 'Erro', description: 'Data de vencimento não calculada', variant: 'destructive' });
      return;
    }

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
        new_expiration_date: finalExpiration,
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
        expirationDate: finalExpiration,
        premiumValue: data.newPremiumValue,
        commissionRate: data.newCommissionRate,
        bonus_class: data.bonusClass,
        ...(data.newPolicyNumber ? { policyNumber: data.newPolicyNumber } : {}),
        ...(data.insuranceCompanyId ? { insuranceCompany: data.insuranceCompanyId } : {}),
        ...(data.startDate ? { startDate: data.startDate } : {}),
        renewalStatus: 'Renovada',
        status: 'Ativa',
      });

      toast({
        title: 'Renovação concluída',
        description: `Apólice ${policy.policyNumber || ''} renovada com sucesso até ${format(new Date(finalExpiration + 'T12:00:00'), 'dd/MM/yyyy')}.`,
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
          <div className="space-y-1.5">
            <Label>Tipo de Renovação</Label>
            <Select value={renewalType} onValueChange={(v) => setValue('renewalType', v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto_6m">Automática - 6 meses</SelectItem>
                <SelectItem value="auto_12m">Automática - 12 meses</SelectItem>
                <SelectItem value="auto_24m">Automática - 24 meses</SelectItem>
                <SelectItem value="manual">Manual (Personalizada)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* New Policy Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label>Comissão (%) *</Label>
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

            <div className="space-y-1.5">
              <Label>Seguradora</Label>
              <Select
                value={watch('insuranceCompanyId')}
                onValueChange={(v) => setValue('insuranceCompanyId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a seguradora" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Classe de Bônus</Label>
              <Select value={watch('bonusClass')} onValueChange={(value) => setValue('bonusClass', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      Classe {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date + computed expiration */}
            <div className="space-y-1.5">
              <Label>Data de Início de Vigência *</Label>
              <Input type="date" {...register('startDate')} />
              {computedExpiration && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <CalendarIcon className="w-3 h-3" />
                  Vencimento: <span className="font-medium text-foreground">
                    {format(computedExpiration, 'dd/MM/yyyy')}
                  </span>
                </p>
              )}
              {errors.startDate && (
                <p className="text-destructive text-xs mt-1">{errors.startDate.message}</p>
              )}
            </div>

            {/* Manual expiration date - only when type is manual */}
            {renewalType === 'manual' && (
              <div className="space-y-1.5">
                <Label>Data de Vencimento *</Label>
                <Input type="date" {...register('manualExpirationDate')} />
              </div>
            )}

            {/* Policy number - side by side with start date */}
            <div className="space-y-1.5">
              <Label>
                Número da Apólice{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                {...register('newPolicyNumber')}
                placeholder="Ex: 123456789"
              />
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-1.5">
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
