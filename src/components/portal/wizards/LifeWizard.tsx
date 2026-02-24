import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Stepper, type Step } from "@/components/ui/stepper";
import { FormCard } from "@/components/ui/form-card";
import { FormInput } from "@/components/ui/form-input";
import { RadioCardGroup } from "@/components/ui/radio-card";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildLifePayload } from "@/utils/dataProcessor";
import { usePartialLead } from "@/hooks/usePartialLead";
import { LgpdConsent } from "@/components/ui/lgpd-consent";

const steps: Step[] = [
  { id: "personal", title: "Dados Pessoais", description: "Suas informações" },
  { id: "health", title: "Saúde", description: "Perfil de saúde" },
  { id: "beneficiaries", title: "Beneficiários", description: "Quem será protegido" },
];

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

const formatCurrency = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  const amount = parseInt(numbers || "0", 10) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

interface LifeWizardProps {
  onComplete?: (payload: any) => void;
}

export const LifeWizard: React.FC<LifeWizardProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { savePartialLead, updateStepIndex, getLeadId } = usePartialLead();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // LGPD Consent
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);

  // Step 1: Personal Data
  const [name, setName] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [profession, setProfession] = React.useState("");

  // Pré-preenchimento via sessão do portal
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('portal_client');
      if (!raw) return;
      const client = JSON.parse(raw);
      if (client.name && !name) setName(client.name);
      if (client.email && !email) setEmail(client.email);
      if (client.phone && !phone) setPhone(formatPhone(client.phone));
      if (client.cpf_cnpj) {
        const digits = client.cpf_cnpj.replace(/\D/g, '');
        if (digits.length <= 11) {
          setCpf(formatCPF(client.cpf_cnpj));
        }
      }
    } catch (e) {
      console.error('Erro ao pré-preencher:', e);
    }
  }, []);

  // Step 2: Health Profile
  const [isSmoker, setIsSmoker] = React.useState(false);
  const [practicesSports, setPracticesSports] = React.useState(false);
  const [hasChronicDisease, setHasChronicDisease] = React.useState(false);
  const [incomeRange, setIncomeRange] = React.useState("3-5");

  // Step 3: Beneficiaries & Coverage
  const [coverageAmount, setCoverageAmount] = React.useState("");
  const [hasBeneficiaries, setHasBeneficiaries] = React.useState(true);
  const [beneficiaryName, setBeneficiaryName] = React.useState("");
  const [beneficiaryRelation, setBeneficiaryRelation] = React.useState("spouse");

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const newErrors = { ...errors };

    switch (field) {
      case "cpf":
        if (value.replace(/\D/g, "").length !== 11) {
          newErrors.cpf = "CPF deve ter 11 dígitos";
        } else {
          delete newErrors.cpf;
        }
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = "E-mail inválido";
        } else {
          delete newErrors.email;
        }
        break;
      case "phone":
        if (value.replace(/\D/g, "").length < 11) {
          newErrors.phone = "Telefone deve ter 11 dígitos";
        } else {
          delete newErrors.phone;
        }
        break;
    }

    setErrors(newErrors);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return (
          name.trim().length >= 3 &&
          cpf.replace(/\D/g, "").length === 11 &&
          birthDate.length > 0 &&
          phone.replace(/\D/g, "").length === 11 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
          profession.trim().length > 0
        );
      case 1:
        return incomeRange.length > 0;
      case 2:
        return coverageAmount.length > 0;
      default:
        return false;
    }
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      // Salvar lead parcial quando sair do Passo 0
      if (currentStep === 0 && !getLeadId()) {
        await savePartialLead({
          name,
          email,
          phone,
          cpf,
          insuranceType: 'Seguro de Vida',
          stepIndex: 1,
        });
      } else if (getLeadId()) {
        await updateStepIndex(currentStep + 1);
      }

      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildLifePayload({
        fullName: name,
        email,
        phone,
        cpf,
        birthDate,
        profession,
        smoker: isSmoker ? 'sim' : 'nao',
        extremeSports: practicesSports,
        coverageAmount,
        coverageDisability: false,
        coverageIllness: hasChronicDisease,
        coverageFuneral: false,
      });

      if (onComplete) {
        onComplete(payload);
      } else {
        toast.error("Configuração de envio incompleta.");
      }
    } catch (error) {
      console.error("Erro no submit:", error);
      toast.error("Erro ao enviar cotação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <Stepper steps={steps} currentStep={currentStep} className="mb-8" />

      <div className="min-h-[400px]">
        {currentStep === 0 && (
          <FormCard
            title="Dados Pessoais"
            description="Informações do titular do seguro"
          >
            <div className="space-y-5">
              <FormInput
                label="Nome Completo"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="CPF"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  onBlur={() => handleBlur("cpf", cpf)}
                  inputMode="numeric"
                  error={touched.cpf ? errors.cpf : undefined}
                  success={touched.cpf && !errors.cpf && cpf.length > 0}
                  required
                />
                <FormInput
                  label="Data de Nascimento"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Celular"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  onBlur={() => handleBlur("phone", phone)}
                  inputMode="tel"
                  error={touched.phone ? errors.phone : undefined}
                  success={touched.phone && !errors.phone && phone.length > 0}
                  required
                />
                <FormInput
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur("email", email)}
                  error={touched.email ? errors.email : undefined}
                  success={touched.email && !errors.email && email.length > 0}
                  required
                />
              </div>

              <FormInput
                label="Profissão"
                placeholder="Ex: Engenheiro, Médico, Autônomo"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                required
              />
            </div>
          </FormCard>
        )}

        {currentStep === 1 && (
          <FormCard
            title="Perfil de Saúde"
            description="Informações para cálculo do seguro"
          >
            <div className="space-y-5">
              <ToggleSwitch
                label="Fumante"
                description="Você fuma ou fumou nos últimos 2 anos?"
                checked={isSmoker}
                onCheckedChange={setIsSmoker}
              />

              <ToggleSwitch
                label="Pratica Esportes Radicais"
                description="Paraquedismo, alpinismo, mergulho, etc."
                checked={practicesSports}
                onCheckedChange={setPracticesSports}
              />

              <ToggleSwitch
                label="Doença Crônica"
                description="Possui diabetes, hipertensão ou outra condição?"
                checked={hasChronicDisease}
                onCheckedChange={setHasChronicDisease}
              />

              <RadioCardGroup
                label="Faixa de Renda Mensal"
                options={[
                  { value: "1-3", label: "R$ 1.000 - R$ 3.000" },
                  { value: "3-5", label: "R$ 3.000 - R$ 5.000" },
                  { value: "5-10", label: "R$ 5.000 - R$ 10.000" },
                  { value: "10+", label: "Acima de R$ 10.000" },
                ]}
                value={incomeRange}
                onChange={setIncomeRange}
              />
            </div>
          </FormCard>
        )}

        {currentStep === 2 && (
          <FormCard
            title="Cobertura e Beneficiários"
            description="Valor e quem será protegido"
          >
            <div className="space-y-5">
              <FormInput
                label="Valor da Cobertura Desejada"
                placeholder="R$ 0,00"
                value={coverageAmount}
                onChange={(e) => setCoverageAmount(formatCurrency(e.target.value))}
                inputMode="numeric"
                hint="Valor que seus beneficiários receberão"
                required
              />

              <ToggleSwitch
                label="Deseja adicionar beneficiários?"
                description="Pessoas que receberão o valor em caso de sinistro"
                checked={hasBeneficiaries}
                onCheckedChange={setHasBeneficiaries}
              />

              {hasBeneficiaries && (
                <>
                  <FormInput
                    label="Nome do Beneficiário Principal"
                    placeholder="Nome completo"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                  />

                  <RadioCardGroup
                    label="Grau de Parentesco"
                    options={[
                      { value: "spouse", label: "Cônjuge" },
                      { value: "child", label: "Filho(a)" },
                      { value: "parent", label: "Pai/Mãe" },
                      { value: "other", label: "Outro" },
                    ]}
                    value={beneficiaryRelation}
                    onChange={setBeneficiaryRelation}
                  />
                </>
              )}
            </div>
          </FormCard>
        )}
      </div>

      {currentStep === steps.length - 1 && (
        <div className="mt-6">
          <LgpdConsent
            acceptedTerms={acceptedTerms}
            acceptedPrivacy={acceptedPrivacy}
            onAcceptTermsChange={setAcceptedTerms}
            onAcceptPrivacyChange={setAcceptedPrivacy}
          />
        </div>
      )}

      <div className="flex items-center justify-between mt-8 gap-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={prevStep}
          disabled={currentStep === 0}
          className="w-14 h-14 rounded-full bg-card shadow-sm flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" strokeWidth={1.5} />
        </motion.button>

        {currentStep < steps.length - 1 ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={nextStep}
            disabled={!isStepValid(currentStep)}
            className="flex-1 h-14 rounded-full bg-foreground text-background font-semibold text-[1.05rem] shadow-lg flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar
            <ArrowRight className="w-5 h-5" strokeWidth={2} />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!isStepValid(currentStep) || isSubmitting || !acceptedTerms || !acceptedPrivacy}
            className="flex-1 h-14 rounded-full bg-foreground text-background font-semibold text-[1.05rem] shadow-lg flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Enviar Cotação
                <ArrowRight className="w-5 h-5" strokeWidth={2} />
              </>
            )}
          </motion.button>
        )}
      </div>

      <div className="flex items-center justify-center mt-6 mb-4">
        <p className="text-xs text-muted-foreground text-center flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Seus dados estão seguros e protegidos.
        </p>
      </div>
    </div>
  );
};
