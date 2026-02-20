import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Users, Building2, Wallet, Phone, Gift, Check } from "lucide-react";
import { toast } from "sonner";

import { useWizardPersistence } from "@/hooks/useWizardPersistence";
import { usePartialLead } from "@/hooks/usePartialLead";
import { fetchCNPJData, formatCNPJ, isValidCNPJ } from "@/utils/cnpjApi";
import { checkHealthQualification, type HealthQualificationConfig } from "@/utils/qualification";
import { trackViewContent, trackLead, trackCompleteRegistration } from "@/utils/metaPixel";
import { sendToRDStation, buildHealthPayload } from "@/utils/dataProcessor";
import { supabase } from "@/integrations/supabase/client";
import { LgpdConsent } from "@/components/ui/lgpd-consent";

// Step Components
import { HealthStep1Lives } from "./HealthStep1Lives";
import { HealthStep2Business } from "./HealthStep2Business";
import { HealthStep3Preferences } from "./HealthStep3Preferences";
import { HealthStep4Contact } from "./HealthStep4Contact";
import { HealthStep5CrossSell } from "./HealthStep5CrossSell";

export interface HealthWizardData {
  // Step 1: Vidas
  livesCount: number;
  lives: Array<{
    id: string;
    age: string;
    relationship: string;
    cpf?: string; // CPF individual (modo PF)
    educationLevel?: string; // Escolaridade individual (modo PF)
  }>;

  // Step 2: Empresarial
  contractType: 'cpf' | 'cnpj';
  cpf: string;
  cnpj: string;
  razaoSocial: string;
  /**
   * Snapshot dos dados retornados pela consulta do CNPJ.
   * Usado para compor o QAR (sem depender do usuário digitar novamente).
   */
  cnpjDetails?: {
    nomeFantasia?: string;
    situacaoCadastral?: string;
    dataInicioAtividade?: string;
    cnaeDescricao?: string;
    endereco?: {
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cep?: string;
      municipio?: string;
      uf?: string;
    };
    porte?: string;
    capitalSocial?: number;
  };
  employeeCount: number;
  educationLevel: string;
  profession: string;

  // Step 3: Preferências
  budget: number;
  networkPreference: string;
  accommodation: string;
  state: string;
  city: string;

  // Step 4: Contato
  name: string;
  email: string;
  phone: string;

  // Step 5: Cross-sell
  hasAutoInsurance: boolean;
  autoExpiry: string;
  hasLifeInsurance: boolean;
  lifeExpiry: string;
  wantsOtherQuotes: boolean;
}

const initialData: HealthWizardData = {
  livesCount: 1,
  lives: [{ id: '1', age: '', relationship: 'holder' }],
  contractType: 'cnpj', // CNPJ é o default agora
  cpf: '',
  cnpj: '',
  razaoSocial: '',
  cnpjDetails: undefined,
  employeeCount: 0,
  educationLevel: '',
  profession: '',
  budget: 500,
  networkPreference: '',
  accommodation: 'apartamento',
  state: '',
  city: '',
  name: '',
  email: '',
  phone: '',
  hasAutoInsurance: false,
  autoExpiry: '',
  hasLifeInsurance: false,
  lifeExpiry: '',
  wantsOtherQuotes: false,
};

const steps = [
  { id: 'lives', title: 'Vidas', icon: Users },
  { id: 'business', title: 'Contratação', icon: Building2 },
  { id: 'preferences', title: 'Preferências', icon: Wallet },
  { id: 'contact', title: 'Contato', icon: Phone },
  { id: 'crosssell', title: 'Benefícios', icon: Gift },
];

export const HealthWizard = () => {
  const navigate = useNavigate();
  const { savePartialLead, updateStepIndex, getLeadId } = usePartialLead();
  
  const {
    data,
    currentStep,
    saveData,
    updateStep,
    clearData,
    hasPersistedData,
  } = useWizardPersistence<HealthWizardData>({
    key: 'health_wizard',
    initialData,
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetchingCNPJ, setIsFetchingCNPJ] = React.useState(false);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);
  const [qualificationConfig, setQualificationConfig] = React.useState<HealthQualificationConfig>({
    ageMin: 0,
    ageMax: 65,
    livesMin: 1,
    livesMax: 99,
    acceptCPF: true,
    acceptCNPJ: true,
    cnpjMinEmployees: 2,
    cpfRequireHigherEducation: false,
    regionMode: 'allow_all',
    regionLocations: [],
    budgetMin: 0,
  });

  // Carregar configurações de qualificação
  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data: settings } = await (supabase as any)
          .from('integration_settings')
          .select('*')
          .eq('id', 1)
          .single();
        
        if (settings) {
          const rawLocations = settings.health_region_locations;
          const legacyStates = settings.health_region_states ?? [];
          
          let regionLocations: Array<{state: string; city?: string}> = [];
          if (rawLocations && Array.isArray(rawLocations) && rawLocations.length > 0) {
            regionLocations = rawLocations;
          } else if (legacyStates.length > 0) {
            regionLocations = legacyStates.map((s: string) => ({ state: s }));
          }
          
          setQualificationConfig({
            ageMin: settings.health_age_limit_min ?? 0,
            ageMax: settings.health_age_limit_max ?? 65,
            livesMin: settings.health_lives_min ?? 1,
            livesMax: settings.health_lives_max ?? 99,
            acceptCPF: settings.health_accept_cpf ?? true,
            acceptCNPJ: settings.health_accept_cnpj ?? true,
            cnpjMinEmployees: settings.health_cnpj_min_employees ?? 2,
            cpfRequireHigherEducation: settings.health_cpf_require_higher_education ?? false,
            regionMode: settings.health_region_mode ?? 'allow_all',
            regionLocations,
            budgetMin: settings.health_budget_min ?? 0,
          });
        }
      } catch (err) {
        console.warn('integration_settings not available, using defaults');
      }
    };
    loadConfig();
  }, []);

  // Track ViewContent no Step 1
  React.useEffect(() => {
    if (currentStep === 0) {
      trackViewContent('Plano de Saúde');
    }
  }, [currentStep]);

  // Mostrar toast se tiver dados restaurados
  React.useEffect(() => {
    if (hasPersistedData()) {
      toast.info('Cotação restaurada', {
        description: 'Continuando de onde você parou.',
      });
    }
  }, []);

  // Handler para buscar CNPJ
  const handleCNPJBlur = React.useCallback(async () => {
    if (!data.cnpj || !isValidCNPJ(data.cnpj)) return;

    setIsFetchingCNPJ(true);
    const result = await fetchCNPJData(data.cnpj);
    setIsFetchingCNPJ(false);

    if (result.success && result.data) {
      saveData({
        razaoSocial: result.data.razao_social,
        cnpjDetails: {
          nomeFantasia: result.data.nome_fantasia,
          situacaoCadastral: result.data.descricao_situacao_cadastral,
          dataInicioAtividade: result.data.data_inicio_atividade,
          cnaeDescricao: result.data.cnae_fiscal_descricao,
          endereco: {
            logradouro: result.data.logradouro,
            numero: result.data.numero,
            complemento: result.data.complemento,
            bairro: result.data.bairro,
            cep: result.data.cep,
            municipio: result.data.municipio,
            uf: result.data.uf,
          },
          porte: result.data.porte,
          capitalSocial: result.data.capital_social,
        },
      });
      toast.success('CNPJ encontrado', {
        description: result.data.razao_social,
      });
    } else if (result.error) {
      toast.error('Erro ao consultar CNPJ', {
        description: result.error,
      });
    }
  }, [data.cnpj, saveData]);

  // Validação de cada step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Vidas
        return data.livesCount >= 1 && 
          data.lives.every(l => l.age && parseInt(l.age) > 0);
      
      case 1: // Empresarial
        if (data.contractType === 'cnpj') {
          return isValidCNPJ(data.cnpj) && data.razaoSocial.length > 0;
        }
        // Modo CPF: todos os lives precisam ter CPF válido
        return data.lives.every(life => 
          life.cpf && life.cpf.replace(/\D/g, '').length === 11
        );
      
      case 2: // Preferências
        return data.budget > 0 && data.accommodation !== '';
      
      case 3: // Contato
        return data.name.trim().length >= 3 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
          data.phone.replace(/\D/g, '').length >= 10;
      
      case 4: // Cross-sell (sempre válido)
        return true;
      
      default:
        return false;
    }
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      const newStep = currentStep + 1;
      updateStep(newStep);
      
      // Salvar lead parcial no Step 3 (contato)
      if (currentStep === 3 && !getLeadId()) {
        await savePartialLead({
          name: data.name,
          email: data.email,
          phone: data.phone,
          cpf: data.contractType === 'cpf' ? data.cpf : undefined,
          cnpj: data.contractType === 'cnpj' ? data.cnpj : undefined,
          insuranceType: 'Plano de Saúde',
          stepIndex: newStep,
        });
        
        // Track Lead event
        trackLead(data.budget);
      } else if (getLeadId()) {
        await updateStepIndex(newStep);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      updateStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      toast.error('Aceite os termos para continuar');
      return;
    }

    setIsSubmitting(true);

    try {
      // Verificar qualificação
      const ages = data.lives
        .filter(l => l.age)
        .map(l => parseInt(l.age));
      
      // Contar funcionários baseado no relacionamento 'employee' nas vidas
      const employeeCount = data.lives.filter(l => {
        const rel = String(l.relationship || '').toLowerCase().trim();
        return rel === 'employee';
      }).length;
      
      const qualification = checkHealthQualification(
        {
          ages,
          livesCount: data.lives.length, // Usar quantidade real de vidas
          contractType: data.contractType,
          employeeCount: employeeCount, // Contar funcionários pelo relacionamento
          educationLevel: data.educationLevel,
          state: data.state,
          city: data.city,
          budgetPerPerson: data.budget,
        },
        qualificationConfig
      );

      // Construir payload com todos os dados
      const payload = buildHealthPayload(
        {
          fullName: data.name,
          email: data.email,
          phone: data.phone,
          cpf: data.cpf,
          // Tipo de contratação
          contractType: data.contractType,
          cnpj: data.cnpj,
          razaoSocial: data.razaoSocial,
          cnpjDetails: data.cnpjDetails,
          // Plano
          planType:
            data.contractType === 'cnpj'
              ? 'empresarial'
              : data.livesCount > 1
                ? 'familiar'
                : 'individual',
          accommodation: data.accommodation,
          budget: data.budget,
          networkPreference: data.networkPreference,
          state: data.state,
          city: data.city,
          // Cross-sell
          hasAutoInsurance: data.hasAutoInsurance,
          autoExpiry: data.autoExpiry,
          hasLifeInsurance: data.hasLifeInsurance,
          lifeExpiry: data.lifeExpiry,
          wantsOtherQuotes: data.wantsOtherQuotes,
          // Qualificação
          is_qualified: qualification.isQualified,
          disqualification_reason: qualification.disqualificationReason,
        },
        data.lives.map((l) => ({
          name: l.relationship === 'holder' ? data.name : `Dependente ${l.id}`,
          relationship: l.relationship,
          age: l.age,
          cpf: l.cpf,
          educationLevel: l.educationLevel,
        }))
      );

      const leadId = getLeadId();
      const success = await sendToRDStation(payload, leadId);

      if (success) {
        // Track CompleteRegistration apenas se qualificado
        trackCompleteRegistration('Plano de Saúde', qualification.isQualified);
        
        clearData();
        navigate('/sucesso');
      } else {
        toast.error('Erro ao enviar cotação. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro no submit:', error);
      toast.error('Erro ao enviar cotação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    const props = {
      data,
      saveData,
      isFetchingCNPJ,
      onCNPJBlur: handleCNPJBlur,
    };

    switch (currentStep) {
      case 0:
        return <HealthStep1Lives {...props} />;
      case 1:
        return <HealthStep2Business {...props} />;
      case 2:
        return <HealthStep3Preferences {...props} />;
      case 3:
        return <HealthStep4Contact {...props} />;
      case 4:
        return <HealthStep5CrossSell {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      {/* Progress Stepper - Minimalista */}
      <div className="mb-10">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <motion.div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${isCompleted 
                      ? 'bg-primary text-primary-foreground' 
                      : isActive 
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' 
                        : 'bg-card border-2 border-border text-muted-foreground'
                    }
                  `}
                  whileHover={{ scale: 1.05 }}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </motion.div>
                <span className={`
                  mt-2 text-xs font-medium transition-colors
                  ${isActive ? 'text-foreground' : 'text-muted-foreground'}
                `}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content - Glassmorphism Card */}
      <motion.div
        className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6 md:p-8"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* LGPD Consent - Último step */}
      {currentStep === steps.length - 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <LgpdConsent
            acceptedTerms={acceptedTerms}
            acceptedPrivacy={acceptedPrivacy}
            onAcceptTermsChange={setAcceptedTerms}
            onAcceptPrivacyChange={setAcceptedPrivacy}
          />
        </motion.div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-full
            font-medium transition-all duration-300
            ${currentStep === 0 
              ? 'text-muted-foreground cursor-not-allowed opacity-50' 
              : 'text-foreground hover:bg-muted'
            }
          `}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            onClick={nextStep}
            disabled={!isStepValid(currentStep)}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-full
              font-semibold transition-all duration-300
              ${isStepValid(currentStep)
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
          >
            Próximo
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!isStepValid(currentStep) || isSubmitting || !acceptedTerms || !acceptedPrivacy}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-full
              font-semibold transition-all duration-300
              ${(isStepValid(currentStep) && acceptedTerms && acceptedPrivacy && !isSubmitting)
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Enviar Cotação
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Security Badge */}
      <div className="flex items-center justify-center mt-6">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Seus dados estão seguros e protegidos.
        </p>
      </div>
    </div>
  );
};
