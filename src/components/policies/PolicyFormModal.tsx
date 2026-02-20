
import React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addYears } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Stepper } from '@/components/ui/stepper';
import {
  User, Building2, DollarSign, Users2,
  Shield, Activity, Tag, Hash,
  Calendar, Percent, TrendingUp,
  User2, Briefcase, AlertCircle,
  Loader2, Check,
  Edit3, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useClients, usePolicies } from '@/hooks/useAppData';
import { QuickAddClientModal } from '@/components/clients/QuickAddClientModal';
import { useSupabaseCompanies } from '@/hooks/useSupabaseCompanies';
import { useSupabaseRamos } from '@/hooks/useSupabaseRamos';
import { useRamosByCompany } from '@/hooks/useRamosByCompany';
import { useSupabaseProducers } from '@/hooks/useSupabaseProducers';
import { useSupabaseBrokerages } from '@/hooks/useSupabaseBrokerages';
import { useSupabaseCompanyBranches } from '@/hooks/useSupabaseCompanyBranches';
import { Separator } from '@/components/ui/separator';
import { policyFormSchema, PolicyFormData } from '@/schemas/policySchema';
import { Policy } from '@/types';
import { toast } from 'sonner';

interface PolicyFormModalProps {
  policy?: Policy;
  isEditing?: boolean;
  onClose: () => void;
  onPolicyAdded?: () => void;
}

const STEPS = [
  'Informações Principais',
  'Detalhes do Seguro',
  'Valores e Vigência',
  'Envolvidos'
];

const STEP_META = [
  {
    icon: User,
    title: 'Informações Principais',
    subtitle: 'Cliente, bem segurado e status inicial',
  },
  {
    icon: Building2,
    title: 'Detalhes do Seguro',
    subtitle: 'Seguradora, ramo e número da apólice',
  },
  {
    icon: DollarSign,
    title: 'Valores e Vigência',
    subtitle: 'Prêmio, comissão e datas de vigência',
  },
  {
    icon: Users2,
    title: 'Envolvidos',
    subtitle: 'Produtor e corretora responsáveis',
  },
];

export function PolicyFormModal({ policy, isEditing = false, onClose, onPolicyAdded }: PolicyFormModalProps) {
  const { clients, refetch: refetchClients } = useClients();
  const { addPolicy, updatePolicy } = usePolicies();
  const { companies } = useSupabaseCompanies();
  const { producers } = useSupabaseProducers();
  const { brokerages } = useSupabaseBrokerages();
  const { companyBranches } = useSupabaseCompanyBranches();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualDueDate, setIsManualDueDate] = useState(false);
  const [pendingRamo, setPendingRamo] = useState<{ id?: string; name?: string } | null>(null);

  // Preparar valores default baseado no modo (criar ou editar)
  const getDefaultValues = (): Partial<PolicyFormData> => {
    if (isEditing && policy) {
      return {
        clientId: policy.clientId,
        policyNumber: policy.policyNumber || '',
        insuranceCompany: policy.insuranceCompany || '',
        type: policy.type || '',
        insuredAsset: policy.insuredAsset || '',
        premiumValue: policy.premiumValue,
        commissionRate: policy.commissionRate,
        status: policy.status,
        startDate: policy.startDate || '',
        expirationDate: policy.expirationDate,
        producerId: policy.producerId || '',
        brokerageId: policy.brokerageId?.toString() || '',
        automaticRenewal: policy.automaticRenewal ?? true,
      };
    }

    return {
      status: 'Orçamento' as const,
      commissionRate: 20,
      insuredAsset: '',
      automaticRenewal: true,
    };
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    resetField,
    trigger
  } = useForm<PolicyFormData>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: getDefaultValues()
  });

  const selectedCompanyId = watch('insuranceCompany');
  const { data: availableBranches = [] } = useRamosByCompany(selectedCompanyId);

  // Seleção reativa do ramo assim que os ramos da seguradora estiverem disponíveis
  React.useEffect(() => {
    if (!pendingRamo) return;
    if (!selectedCompanyId) return;
    if (!availableBranches || availableBranches.length === 0) return;

    let foundRamo: { id: string; nome: string } | null = null;

    if (pendingRamo.id) {
      foundRamo = availableBranches.find(r => r.id === pendingRamo.id) || null;
    }

    if (!foundRamo && pendingRamo.name) {
      const normalized = pendingRamo.name.toLowerCase().trim();
      foundRamo = availableBranches.find(r => r.nome.toLowerCase().trim() === normalized) || null;

      if (!foundRamo) {
        foundRamo = availableBranches.find(r => {
          const n = r.nome.toLowerCase().trim();
          return n.includes(normalized) || normalized.includes(n);
        }) || null;
      }

      if (!foundRamo) {
        foundRamo = availableBranches.find(r => {
          const words = normalized.split(' ').filter(w => w.length > 2);
          const ramoWords = r.nome.toLowerCase().split(' ');
          return words.some(sw => ramoWords.some(rw => rw.includes(sw) || sw.includes(rw)));
        }) || null;
      }

      if (!foundRamo) {
        const abreviacoes: Record<string, string[]> = {
          'auto': ['automóvel', 'veículo', 'carro', 'automóveis'],
          'residencial': ['residência', 'casa', 'imóvel'],
          'vida': ['seguro de vida', 'vida individual'],
          'rc': ['responsabilidade civil', 'resp civil'],
          'empresarial': ['empresa', 'comercial']
        };

        for (const [key, variants] of Object.entries(abreviacoes)) {
          if (normalized.includes(key) || variants.some(v => normalized.includes(v))) {
            foundRamo = availableBranches.find(r => {
              const rl = r.nome.toLowerCase();
              return rl.includes(key) || variants.some(v => rl.includes(v));
            }) || null;
            if (foundRamo) break;
          }
        }
      }
    }

    if (foundRamo) {
      setValue('type', foundRamo.id);
      setPendingRamo(null);
      toast.success('Ramo identificado', {
        description: `${foundRamo.nome} selecionado automaticamente`
      });
    } else {
      console.warn('⚠️ Ramo não encontrado para esta seguradora:', pendingRamo.name || pendingRamo.id);
      toast.warning('Ramo não disponível', {
        description: 'Selecione o ramo manualmente'
      });
      setPendingRamo(null);
    }
  }, [pendingRamo, availableBranches, selectedCompanyId, setValue]);

  // Reset branch when company changes
  React.useEffect(() => {
    if (selectedCompanyId && watch('type')) {
      setValue('type', '');
    }
  }, [selectedCompanyId, setValue, watch]);

  const currentStatus = watch('status');
  const startDate = watch('startDate');

  React.useEffect(() => {
    if (!isManualDueDate && startDate && !isEditing) {
      const calculatedExpirationDate = format(addYears(new Date(startDate), 1), 'yyyy-MM-dd');
      setValue('expirationDate', calculatedExpirationDate);
    }
  }, [startDate, isManualDueDate, setValue, isEditing]);

  const handleToggleDueDateMode = () => {
    if (isManualDueDate) {
      resetField('expirationDate');
      setIsManualDueDate(false);
      if (startDate) {
        const calculatedExpirationDate = format(addYears(new Date(startDate), 1), 'yyyy-MM-dd');
        setValue('expirationDate', calculatedExpirationDate);
      }
    } else {
      setIsManualDueDate(true);
    }
  };

  const getFieldsForStep = (step: number): (keyof PolicyFormData)[] => {
    switch (step) {
      case 1:
        return ['clientId', 'insuredAsset', 'status'];
      case 2:
        return ['insuranceCompany', 'type', 'policyNumber'];
      case 3:
        return ['premiumValue', 'commissionRate', 'startDate', 'expirationDate'];
      case 4:
        return ['producerId', 'brokerageId'];
      default:
        return [];
    }
  };

  const handleNext = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);

    try {
      const data = watch();
      const finalData = {
        ...data,
        brokerageId: data.brokerageId ? parseInt(data.brokerageId) : undefined,
        expirationDate: data.expirationDate || (startDate ? format(addYears(new Date(startDate), 1), 'yyyy-MM-dd') : undefined),
      };

      if (isEditing && policy) {
        await updatePolicy(policy.id, finalData);
      } else {
        await addPolicy(finalData);
      }

      reset();
      setCurrentStep(1);
      setIsManualDueDate(false);
      onPolicyAdded?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar apólice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: `${client.name} - ${client.phone}`
  }));

  const handleClientCreated = (newClient: { id: string }) => {
    refetchClients();
    setValue('clientId', newClient.id);
  };

  const renderStepHeader = () => {
    const meta = STEP_META[currentStep - 1];
    const MetaIcon = meta.icon;
    return (
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <MetaIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{meta.title}</h3>
          <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    const content = (() => {
      switch (currentStep) {
        case 1:
          return (
            <div className="space-y-5">
              {/* Cliente */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  Cliente
                  <span className="text-destructive text-xs">*</span>
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Combobox
                      options={clientOptions}
                      value={watch('clientId')}
                      onValueChange={(value) => setValue('clientId', value)}
                      placeholder="Buscar e selecionar cliente..."
                      searchPlaceholder="Digite o nome ou telefone do cliente..."
                      emptyText="Nenhum cliente encontrado."
                    />
                  </div>
                  <QuickAddClientModal onClientCreated={handleClientCreated} />
                </div>
                {errors.clientId && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.clientId.message}
                  </p>
                )}
              </div>

              {/* Bem Segurado */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  Bem Segurado
                  <span className="text-destructive text-xs">*</span>
                </Label>
                <Textarea
                  {...register('insuredAsset')}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  placeholder="Descreva o bem segurado..."
                  rows={3}
                />
                {errors.insuredAsset && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.insuredAsset.message}
                  </p>
                )}
              </div>

              {/* Status — Pill Buttons */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  Status
                  <span className="text-destructive text-xs">*</span>
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'Orçamento', label: 'Orçamento', color: 'blue' },
                    { value: 'Aguardando Apólice', label: 'Aguardando', color: 'amber' },
                    { value: 'Ativa', label: 'Ativa', color: 'green' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('status', opt.value as any)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200",
                        watch('status') === opt.value
                          ? opt.color === 'blue'
                            ? "bg-blue-500/15 border-blue-500 text-blue-400"
                            : opt.color === 'amber'
                              ? "bg-amber-500/15 border-amber-500 text-amber-400"
                              : "bg-emerald-500/15 border-emerald-500 text-emerald-400"
                          : "bg-transparent border-border text-muted-foreground hover:border-border/80 hover:bg-muted/30"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );

        case 2:
          return (
            <div className="space-y-5">
              {/* Seguradora */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Seguradora
                  {currentStatus !== 'Orçamento' && <span className="text-destructive text-xs">*</span>}
                </Label>
                <Select value={watch('insuranceCompany')} onValueChange={(value) => setValue('insuranceCompany', value)}>
                  <SelectTrigger className="bg-background border-border text-foreground focus:border-primary/50">
                    <SelectValue placeholder="Selecione a seguradora" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.insuranceCompany && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.insuranceCompany.message}
                  </p>
                )}
              </div>

              {/* Ramo */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  Ramo
                  {currentStatus !== 'Orçamento' && <span className="text-destructive text-xs">*</span>}
                </Label>
                <Select value={watch('type')} onValueChange={(value) => setValue('type', value)}>
                  <SelectTrigger className="bg-background border-border text-foreground focus:border-primary/50">
                    <SelectValue placeholder="Selecione o ramo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {availableBranches.map((ramo) => (
                      <SelectItem key={ramo.id} value={ramo.id}>
                        {ramo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedCompanyId && (
                  <p className="text-xs text-muted-foreground mt-1">Selecione a seguradora primeiro</p>
                )}
                {errors.type && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.type.message}
                  </p>
                )}
              </div>

              {/* Número da Apólice */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  Número da Apólice
                </Label>
                <Input
                  {...register('policyNumber')}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  placeholder="Ex: 12345678"
                />
              </div>
            </div>
          );

        case 3:
          return (
            <div className="space-y-5">
              {/* Valores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    Valor do Prêmio
                    <span className="text-destructive text-xs">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      R$
                    </span>
                    <Input
                      {...register('premiumValue', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground"
                      placeholder="0,00"
                    />
                  </div>
                  {errors.premiumValue && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.premiumValue.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                    Taxa de Comissão
                    <span className="text-destructive text-xs">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      {...register('commissionRate', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="pr-9 bg-background border-border text-foreground"
                      placeholder="20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                  {errors.commissionRate && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.commissionRate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Commission Preview */}
              {(() => {
                const premium = watch('premiumValue');
                const rate = watch('commissionRate');
                if (premium && rate) {
                  const commissionValue = premium * (rate / 100);
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-sm text-emerald-400">
                        Comissão estimada:{' '}
                        <span className="font-semibold">
                          {commissionValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Toggle Renovação Automática */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Renovação Automática</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gera alerta de renovação próximo ao vencimento
                  </p>
                </div>
                <Switch
                  id="automaticRenewal"
                  checked={watch('automaticRenewal')}
                  onCheckedChange={(checked) => setValue('automaticRenewal', checked)}
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Data de Início
                    <span className="text-destructive text-xs">*</span>
                  </Label>
                  <Input
                    {...register('startDate')}
                    type="date"
                    className="bg-background border-border text-foreground"
                  />
                  {errors.startDate && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.startDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      Vencimento
                    </Label>
                    {!isManualDueDate && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                        Auto +1 ano
                      </span>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleToggleDueDateMode}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          {isManualDueDate ? <X size={13} /> : <Edit3 size={13} />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isManualDueDate ? 'Voltar para cálculo automático' : 'Definir data manual'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {isManualDueDate ? (
                    <Input
                      {...register('expirationDate')}
                      type="date"
                      className="bg-background border-border text-foreground"
                    />
                  ) : (
                    <div className="flex h-10 w-full items-center rounded-md border border-border/50 bg-muted/30 px-3 text-sm text-muted-foreground">
                      Calculado automaticamente a partir do início
                    </div>
                  )}
                </div>
              </div>
            </div>
          );

        case 4:
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <User2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Produtor
                  </Label>
                  <Select value={watch('producerId')} onValueChange={(value) => setValue('producerId', value)}>
                    <SelectTrigger className="bg-background border-border text-foreground focus:border-primary/50">
                      <SelectValue placeholder="Selecione o produtor" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {producers.map((producer) => (
                        <SelectItem key={producer.id} value={producer.id}>
                          {producer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    Corretora
                  </Label>
                  <Select value={watch('brokerageId')} onValueChange={(value) => setValue('brokerageId', value)}>
                    <SelectTrigger className="bg-background border-border text-foreground focus:border-primary/50">
                      <SelectValue placeholder="Selecione a corretora" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {brokerages.map((brokerage) => (
                        <SelectItem key={brokerage.id} value={brokerage.id.toString()}>
                          {brokerage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Summary Card */}
              {(() => {
                const clienteName = clients.find(c => c.id === watch('clientId'))?.name;
                const companyName = companies.find(c => c.id === watch('insuranceCompany'))?.name;
                const premium = watch('premiumValue');
                if (!clienteName && !companyName) return null;
                return (
                  <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo da Apólice</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {clienteName && (
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-foreground truncate">{clienteName}</span>
                        </div>
                      )}
                      {companyName && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-foreground truncate">{companyName}</span>
                        </div>
                      )}
                      {premium > 0 && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-foreground">
                            {premium.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          );

        default:
          return null;
      }
    })();

    return (
      <div
        key={currentStep}
        className="animate-in fade-in slide-in-from-right-4 duration-300"
      >
        {renderStepHeader()}
        {content}
      </div>
    );
  };

  const renderNavigationButtons = () => (
    <div className="flex justify-between items-center pt-5 mt-5 border-t border-border/50">
      <Button
        type="button"
        variant="ghost"
        onClick={currentStep === 1 ? onClose : handleBack}
        className="text-muted-foreground hover:text-foreground gap-1.5"
      >
        {currentStep === 1 ? (
          <>
            <X className="w-4 h-4" />
            Cancelar
          </>
        ) : (
          <>
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </>
        )}
      </Button>

      {currentStep < STEPS.length ? (
        <Button
          type="button"
          onClick={handleNext}
          className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-6"
        >
          Avançar
          <ChevronRight className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-6 min-w-[130px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isEditing ? 'Salvando...' : 'Criando...'}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {isEditing ? 'Salvar Alterações' : 'Criar Apólice'}
            </>
          )}
        </Button>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Stepper steps={STEPS} currentStep={currentStep} />

        <div>
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {renderNavigationButtons()}
        </div>
      </div>
    </TooltipProvider>
  );
}
