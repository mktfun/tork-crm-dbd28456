
import React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addYears } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

/* ── Settings Row helper ── */
function SettingsRow({ icon: Icon, label, required, children, error }: {
  icon: React.ElementType;
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </p>
      </div>
      {children}
      {error && (
        <p className="text-destructive text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

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

  // ── Default values (create vs edit) ──
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

  // ── Reactive ramo selection ──
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
      case 1: return ['clientId', 'insuredAsset', 'status'];
      case 2: return ['insuranceCompany', 'type', 'policyNumber'];
      case 3: return ['premiumValue', 'commissionRate', 'startDate', 'expirationDate'];
      case 4: return ['producerId', 'brokerageId'];
      default: return [];
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

  /* ═══════════════════════════════════════════════
     RENDER: STEP CONTENT
     ═══════════════════════════════════════════════ */

  const renderStepContent = () => {
    const meta = STEP_META[currentStep - 1];
    const MetaIcon = meta.icon;

    const content = (() => {
      switch (currentStep) {
        /* ── STEP 1: Informações Principais ── */
        case 1:
          return (
            <div className="space-y-4">
              {/* Settings Island: Cliente + Bem Segurado */}
              <div className="bg-card rounded-2xl overflow-hidden divide-y divide-muted/30">
                <SettingsRow icon={User} label="Cliente" required error={errors.clientId?.message}>
                  <div className="flex gap-2">
                    <Combobox
                      options={clientOptions}
                      value={watch('clientId')}
                      onValueChange={(value) => setValue('clientId', value)}
                      placeholder="Buscar e selecionar cliente..."
                      searchPlaceholder="Digite o nome ou telefone..."
                      emptyText="Nenhum cliente encontrado."
                      className="flex-1 border-0 bg-transparent shadow-none"
                    />
                    <QuickAddClientModal onClientCreated={handleClientCreated} />
                  </div>
                </SettingsRow>

                <SettingsRow icon={Shield} label="Bem Segurado" required error={errors.insuredAsset?.message}>
                  <Textarea
                    {...register('insuredAsset')}
                    className="border-0 bg-transparent shadow-none resize-none p-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50 min-h-[60px]"
                    placeholder="Descreva o bem segurado..."
                    rows={2}
                  />
                </SettingsRow>
              </div>

              {/* Status Pills */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Status
                </p>
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
                        "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                        watch('status') === opt.value
                          ? opt.color === 'blue'
                            ? "bg-blue-500/15 border-blue-500/40 text-blue-500 dark:text-blue-400"
                            : opt.color === 'amber'
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
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

        /* ── STEP 2: Detalhes do Seguro ── */
        case 2:
          return (
            <div className="space-y-4">
              <div className="bg-card rounded-2xl overflow-hidden divide-y divide-muted/30">
                <SettingsRow icon={Building2} label="Seguradora" required={currentStatus !== 'Orçamento'} error={errors.insuranceCompany?.message}>
                  <Select value={watch('insuranceCompany')} onValueChange={(value) => setValue('insuranceCompany', value)}>
                    <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 px-0">
                      <SelectValue placeholder="Selecione a seguradora" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsRow>

                <SettingsRow icon={Tag} label="Ramo" required={currentStatus !== 'Orçamento'} error={errors.type?.message}>
                  <Select value={watch('type')} onValueChange={(value) => setValue('type', value)}>
                    <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 px-0">
                      <SelectValue placeholder={selectedCompanyId ? "Selecione o ramo" : "Selecione a seguradora primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBranches.map((ramo) => (
                        <SelectItem key={ramo.id} value={ramo.id}>
                          {ramo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsRow>

                <SettingsRow icon={Hash} label="Nº da Apólice" error={errors.policyNumber?.message}>
                  <Input
                    {...register('policyNumber')}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 text-foreground placeholder:text-muted-foreground/50"
                    placeholder="Ex: 12345678"
                  />
                </SettingsRow>
              </div>
            </div>
          );

        /* ── STEP 3: Valores e Vigência ── */
        case 3:
          return (
            <div className="space-y-4">
              {/* Hero Numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-2xl p-5 text-center space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor do Prêmio</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-muted-foreground text-lg">R$</span>
                    <Input
                      {...register('premiumValue', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="text-center text-3xl font-bold border-0 bg-transparent shadow-none focus-visible:ring-0 w-full"
                      placeholder="0,00"
                    />
                  </div>
                  {errors.premiumValue && (
                    <p className="text-destructive text-xs">{errors.premiumValue.message}</p>
                  )}
                </div>

                <div className="bg-card rounded-2xl p-5 text-center space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Comissão</p>
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      {...register('commissionRate', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="text-center text-3xl font-bold border-0 bg-transparent shadow-none focus-visible:ring-0 w-full"
                      placeholder="20"
                    />
                    <span className="text-muted-foreground text-lg">%</span>
                  </div>
                  {errors.commissionRate && (
                    <p className="text-destructive text-xs">{errors.commissionRate.message}</p>
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
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
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

              {/* Renewal Toggle */}
              <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-card">
                <div>
                  <p className="text-sm font-medium text-foreground">Renovação Automática</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gera alerta próximo ao vencimento
                  </p>
                </div>
                <Switch
                  id="automaticRenewal"
                  checked={watch('automaticRenewal')}
                  onCheckedChange={(checked) => setValue('automaticRenewal', checked)}
                />
              </div>

              {/* Dates Settings Island */}
              <div className="bg-card rounded-2xl overflow-hidden divide-y divide-muted/30">
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    Data de Início <span className="text-destructive">*</span>
                  </span>
                  <Input
                    {...register('startDate')}
                    type="date"
                    className="w-[160px] border-0 bg-transparent text-right shadow-none focus-visible:ring-0 font-mono text-sm text-foreground"
                  />
                </div>
                {errors.startDate && (
                  <div className="px-5 pb-2">
                    <p className="text-destructive text-xs">{errors.startDate.message}</p>
                  </div>
                )}

                <div className="flex items-center justify-between px-5 py-4">
                  <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    Vencimento
                    {!isManualDueDate && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium normal-case tracking-normal">
                        Auto
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {isManualDueDate ? (
                      <Input
                        {...register('expirationDate')}
                        type="date"
                        className="w-[160px] border-0 bg-transparent text-right shadow-none focus-visible:ring-0 font-mono text-sm text-foreground"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground font-mono">
                        {startDate ? format(addYears(new Date(startDate), 1), 'dd/MM/yyyy') : '—'}
                      </span>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleToggleDueDateMode}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-full"
                        >
                          {isManualDueDate ? <X size={13} /> : <Edit3 size={13} />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isManualDueDate ? 'Voltar para automático' : 'Definir data manual'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          );

        /* ── STEP 4: Envolvidos ── */
        case 4:
          return (
            <div className="space-y-4">
              <div className="bg-card rounded-2xl overflow-hidden divide-y divide-muted/30">
                <SettingsRow icon={User2} label="Produtor">
                  <Select value={watch('producerId')} onValueChange={(value) => setValue('producerId', value)}>
                    <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 px-0">
                      <SelectValue placeholder="Selecione o produtor" />
                    </SelectTrigger>
                    <SelectContent>
                      {producers.map((producer) => (
                        <SelectItem key={producer.id} value={producer.id}>
                          {producer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsRow>

                <SettingsRow icon={Briefcase} label="Corretora">
                  <Select value={watch('brokerageId')} onValueChange={(value) => setValue('brokerageId', value)}>
                    <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 px-0">
                      <SelectValue placeholder="Selecione a corretora" />
                    </SelectTrigger>
                    <SelectContent>
                      {brokerages.map((brokerage) => (
                        <SelectItem key={brokerage.id} value={brokerage.id.toString()}>
                          {brokerage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsRow>
              </div>

              {/* Summary Ticket */}
              {(() => {
                const clienteName = clients.find(c => c.id === watch('clientId'))?.name;
                const companyName = companies.find(c => c.id === watch('insuranceCompany'))?.name;
                const premium = watch('premiumValue');
                const rate = watch('commissionRate');
                if (!clienteName && !companyName) return null;
                return (
                  <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 space-y-3">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Resumo da Apólice</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {clienteName && (
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                          <span className="text-foreground truncate">{clienteName}</span>
                        </div>
                      )}
                      {companyName && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                          <span className="text-foreground truncate">{companyName}</span>
                        </div>
                      )}
                      {premium > 0 && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                          <span className="text-foreground font-semibold">
                            {premium.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      )}
                      {premium > 0 && rate > 0 && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                          <span className="text-foreground">
                            {(premium * (rate / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            <span className="text-muted-foreground text-xs ml-1">({rate}%)</span>
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
        {/* Step Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-muted/20">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <MetaIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{meta.title}</h3>
            <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>
        {content}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════
     RENDER: MAIN
     ═══════════════════════════════════════════════ */

  return (
    <TooltipProvider>
      <div className="flex flex-col">
        {/* Progress Bar */}
        <div className="px-6 pt-6 space-y-3">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Etapa {currentStep} de {STEPS.length}
            </p>
            <p className="text-xs text-muted-foreground">{STEPS[currentStep - 1]}</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 py-5 min-h-[380px]">
          {renderStepContent()}
        </div>

        {/* Navigation Footer */}
        <div className="px-6 py-5 border-t border-muted/20 flex gap-3 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={currentStep === 1 ? onClose : handleBack}
            className="h-12 w-1/3 rounded-xl text-muted-foreground hover:text-foreground font-medium"
          >
            {currentStep === 1 ? 'Cancelar' : (
              <span className="flex items-center gap-1.5">
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </span>
            )}
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              className="h-12 flex-1 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl active:scale-[0.97] transition-all"
            >
              Avançar
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="h-12 flex-1 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl active:scale-[0.97] transition-all min-w-[130px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  {isEditing ? 'Salvando...' : 'Criando...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  {isEditing ? 'Salvar Alterações' : 'Criar Apólice'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
