import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Stepper, type Step } from "@/components/ui/stepper";
import { FormCard } from "@/components/ui/form-card";
import { FormInput } from "@/components/ui/form-input";
import { RadioCardGroup } from "@/components/ui/radio-card";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildBusinessPayload } from "@/utils/dataProcessor";
import { usePartialLead } from "@/hooks/usePartialLead";
import { LgpdConsent } from "@/components/ui/lgpd-consent";

const steps: Step[] = [
  { id: "company", title: "Dados da Empresa", description: "Informações básicas" },
  { id: "activity", title: "Atividade", description: "Ramo de atuação" },
  { id: "coverage", title: "Cobertura", description: "Proteções desejadas" },
];

const formatCNPJ = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})/, "$1-$2")
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

interface BusinessWizardProps {
  onComplete?: (payload: any) => void;
}

export const BusinessWizard: React.FC<BusinessWizardProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { savePartialLead, updateStepIndex, getLeadId } = usePartialLead();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // LGPD Consent
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);

  // Step 1: Company Data
  const [companyName, setCompanyName] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");

  // Pré-preenchimento via sessão do portal
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('portal_client');
      if (!raw) return;
      const client = JSON.parse(raw);
      if (client.name && !contactName) setContactName(client.name);
      if (client.email && !email) setEmail(client.email);
      if (client.phone && !phone) setPhone(formatPhone(client.phone));
      if (client.cpf_cnpj) {
        const digits = client.cpf_cnpj.replace(/\D/g, '');
        if (digits.length > 11) {
          setCnpj(formatCNPJ(client.cpf_cnpj));
        }
      }
    } catch (e) {
      console.error('Erro ao pré-preencher:', e);
    }
  }, []);

  // Step 2: Activity
  const [activityType, setActivityType] = React.useState("commerce");
  const [employeeCount, setEmployeeCount] = React.useState("1-10");
  const [annualRevenue, setAnnualRevenue] = React.useState("");
  const [hasPhysicalStore, setHasPhysicalStore] = React.useState(true);

  // Step 3: Coverage
  const [propertyValue, setPropertyValue] = React.useState("");
  const [wantLiabilityCoverage, setWantLiabilityCoverage] = React.useState(true);
  const [wantEmployeeCoverage, setWantEmployeeCoverage] = React.useState(false);
  const [wantEquipmentCoverage, setWantEquipmentCoverage] = React.useState(true);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const newErrors = { ...errors };

    switch (field) {
      case "cnpj":
        if (value.replace(/\D/g, "").length !== 14) {
          newErrors.cnpj = "CNPJ deve ter 14 dígitos";
        } else {
          delete newErrors.cnpj;
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
        if (value.replace(/\D/g, "").length < 10) {
          newErrors.phone = "Telefone inválido";
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
          companyName.trim().length >= 3 &&
          cnpj.replace(/\D/g, "").length === 14 &&
          contactName.trim().length >= 3 &&
          phone.replace(/\D/g, "").length >= 10 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        );
      case 1:
        return activityType && employeeCount;
      case 2:
        return propertyValue.length > 0;
      default:
        return false;
    }
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      // Salvar lead parcial quando sair do Passo 0
      if (currentStep === 0 && !getLeadId()) {
        await savePartialLead({
          name: contactName,
          email,
          phone,
          cnpj,
          personType: 'pj',
          insuranceType: 'Seguro Empresarial',
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
      const payload = buildBusinessPayload({
        fullName: contactName,
        email,
        phone,
        cnpj,
        companyName,
        businessActivity: activityType,
        cep: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        annualRevenue,
        employeeCount,
        coverageFire: false,
        coverageTheft: false,
        coverageLiability: wantLiabilityCoverage,
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
    <div className="w-full max-w-2xl mx-auto pb-20">
      <Stepper steps={steps} currentStep={currentStep} className="mb-8" />

      <div className="min-h-[400px]">
        {currentStep === 0 && (
          <FormCard
            title="Dados da Empresa"
            description="Informações básicas do seu negócio"
          >
            <div className="space-y-5">
              <FormInput
                label="Razão Social"
                placeholder="Nome da empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />

              <FormInput
                label="CNPJ"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                onBlur={() => handleBlur("cnpj", cnpj)}
                inputMode="numeric"
                error={touched.cnpj ? errors.cnpj : undefined}
                success={touched.cnpj && !errors.cnpj && cnpj.length > 0}
                required
              />

              <FormInput
                label="Nome do Responsável"
                placeholder="Pessoa de contato"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Telefone"
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
                  placeholder="empresa@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur("email", email)}
                  error={touched.email ? errors.email : undefined}
                  success={touched.email && !errors.email && email.length > 0}
                  required
                />
              </div>
            </div>
          </FormCard>
        )}

        {currentStep === 1 && (
          <FormCard
            title="Atividade da Empresa"
            description="Informações sobre o ramo de atuação"
          >
            <div className="space-y-5">
              <RadioCardGroup
                label="Ramo de Atividade"
                options={[
                  { value: "commerce", label: "Comércio", description: "Lojas, varejo" },
                  { value: "services", label: "Serviços", description: "Prestação de serviços" },
                  { value: "industry", label: "Indústria", description: "Fabricação" },
                  { value: "tech", label: "Tecnologia", description: "Software, TI" },
                ]}
                value={activityType}
                onChange={setActivityType}
              />

              <RadioCardGroup
                label="Número de Funcionários"
                options={[
                  { value: "1-10", label: "1 a 10" },
                  { value: "11-50", label: "11 a 50" },
                  { value: "51-200", label: "51 a 200" },
                  { value: "200+", label: "Mais de 200" },
                ]}
                value={employeeCount}
                onChange={setEmployeeCount}
              />

              <FormInput
                label="Faturamento Anual Estimado"
                placeholder="R$ 0,00"
                value={annualRevenue}
                onChange={(e) => setAnnualRevenue(formatCurrency(e.target.value))}
                inputMode="numeric"
                hint="Opcional - ajuda a dimensionar a cobertura"
              />

              <ToggleSwitch
                label="Possui estabelecimento físico?"
                description="Loja, escritório, fábrica, etc."
                checked={hasPhysicalStore}
                onCheckedChange={setHasPhysicalStore}
              />
            </div>
          </FormCard>
        )}

        {currentStep === 2 && (
          <FormCard
            title="Coberturas Desejadas"
            description="Selecione as proteções para sua empresa"
          >
            <div className="space-y-5">
              <FormInput
                label="Valor do Patrimônio"
                placeholder="R$ 0,00"
                value={propertyValue}
                onChange={(e) => setPropertyValue(formatCurrency(e.target.value))}
                inputMode="numeric"
                hint="Imóvel, estoque, equipamentos, etc."
                required
              />

              <ToggleSwitch
                label="Responsabilidade Civil"
                description="Cobertura para danos causados a terceiros"
                checked={wantLiabilityCoverage}
                onCheckedChange={setWantLiabilityCoverage}
              />

              <ToggleSwitch
                label="Acidentes de Trabalho"
                description="Proteção para funcionários"
                checked={wantEmployeeCoverage}
                onCheckedChange={setWantEmployeeCoverage}
              />

              <ToggleSwitch
                label="Equipamentos e Maquinário"
                description="Cobertura para equipamentos específicos"
                checked={wantEquipmentCoverage}
                onCheckedChange={setWantEquipmentCoverage}
              />
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

      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline-subtle"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft size={18} />
          Voltar
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button
            variant="cta"
            onClick={nextStep}
            disabled={!isStepValid(currentStep)}
            className="gap-2"
          >
            Próximo
            <ArrowRight size={18} />
          </Button>
        ) : (
          <Button
            variant="cta"
            onClick={handleSubmit}
            disabled={!isStepValid(currentStep) || isSubmitting || !acceptedTerms || !acceptedPrivacy}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Enviar Cotação
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex items-center justify-center mt-6 mb-4">
        <p className="text-xs text-muted-foreground text-center flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Seus dados estão seguros e não serão compartilhados com terceiros.
        </p>
      </div>
    </div>
  );
};
