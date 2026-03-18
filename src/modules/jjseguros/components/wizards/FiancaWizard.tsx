import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Stepper, type Step } from "@/modules/jjseguros/components/ui/stepper";
import { FormCard } from "@/modules/jjseguros/components/ui/form-card";
import { FormInput } from "@/modules/jjseguros/components/ui/form-input";
import { RadioCardGroup } from "@/modules/jjseguros/components/ui/radio-card";
import { SegmentedControl } from "@/modules/jjseguros/components/ui/segmented-control";
import { Button } from "@/modules/jjseguros/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/jjseguros/components/ui/select";
import { ArrowLeft, ArrowRight, Home, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendToRDStation, buildFiancaPayload } from "@/modules/jjseguros/utils/dataProcessor";
import { usePartialLead } from "@/modules/jjseguros/hooks/usePartialLead";
import { LgpdConsent } from "@/modules/jjseguros/components/ui/lgpd-consent";

const steps: Step[] = [
  { id: "tenant", title: "Locatário", description: "Dados pessoais" },
  { id: "property", title: "Imóvel", description: "Endereço e valores" },
];

// Formatters
const formatCPF = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");

const formatPhone = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");

const formatCEP = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{3})\d+?$/, "$1");

const formatCurrency = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  const amount = parseInt(numbers || "0", 10) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatDate = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{4})\d+?$/, "$1");

export const FiancaWizard = () => {
  const navigate = useNavigate();
  const { savePartialLead, updateStepIndex, getLeadId } = usePartialLead();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // LGPD
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);

  // Step 1 — Dados do Locatário
  const [fullName, setFullName] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [profession, setProfession] = React.useState("");
  const [maritalStatus, setMaritalStatus] = React.useState("");
  const [email, setEmail] = React.useState("");

  // Step 2 — Dados do Imóvel
  const [propertyType, setPropertyType] = React.useState<"casa" | "apartamento">("casa");
  const [cep, setCep] = React.useState("");
  const [street, setStreet] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [complement, setComplement] = React.useState("");
  const [neighborhood, setNeighborhood] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [rentValue, setRentValue] = React.useState("");
  const [condoValue, setCondoValue] = React.useState("");
  const [iptuValue, setIptuValue] = React.useState("");
  const [contractDuration, setContractDuration] = React.useState<"12" | "30">("30");

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // CEP auto-fill
  const fetchAddressFromCep = React.useCallback(async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  }, []);

  // Validation
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "cpf":
        if (value.replace(/\D/g, "").length !== 11) return "CPF deve ter 11 dígitos";
        break;
      case "email":
        if (!value.includes("@") || !value.includes(".")) return "E-mail inválido";
        break;
      case "phone":
        if (value.replace(/\D/g, "").length < 10) return "Telefone inválido";
        break;
      case "cep":
        if (value.replace(/\D/g, "").length !== 8) return "CEP deve ter 8 dígitos";
        break;
    }
    return undefined;
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (error) newErrors[field] = error;
      else delete newErrors[field];
      return newErrors;
    });
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return (
          fullName.trim().length >= 3 &&
          cpf.replace(/\D/g, "").length === 11 &&
          birthDate.replace(/\D/g, "").length === 8 &&
          phone.replace(/\D/g, "").length >= 10 &&
          profession.trim().length > 0 &&
          maritalStatus.length > 0 &&
          email.includes("@")
        );
      case 1:
        return (
          cep.replace(/\D/g, "").length === 8 &&
          street.trim().length > 0 &&
          number.trim().length > 0 &&
          city.trim().length > 0 &&
          rentValue.length > 0
        );
      default:
        return false;
    }
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      if (currentStep === 0 && !getLeadId()) {
        await savePartialLead({
          name: fullName,
          email,
          phone,
          cpf,
          insuranceType: "Seguro Fiança Residencial",
          stepIndex: 1,
        });
      } else if (getLeadId()) {
        await updateStepIndex(currentStep + 1);
      }
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildFiancaPayload({
        fullName,
        cpf,
        birthDate,
        phone,
        profession,
        maritalStatus,
        email,
        propertyType,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        rentValue,
        condoValue,
        iptuValue,
        contractDuration,
      });

      const leadId = getLeadId();
      const success = await sendToRDStation(payload, leadId);
      if (success) {
        navigate("/sucesso");
      } else {
        toast.error("Erro ao enviar cotação. Tente novamente.");
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
        {/* Step 1: Dados do Locatário */}
        {currentStep === 0 && (
          <FormCard title="Dados do Locatário" description="Informações pessoais do inquilino">
            <div className="space-y-5">
              <FormInput
                label="Nome Completo"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

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
                placeholder="DD/MM/AAAA"
                value={birthDate}
                onChange={(e) => setBirthDate(formatDate(e.target.value))}
                inputMode="numeric"
                required
              />

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
                label="Profissão"
                placeholder="Sua profissão"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                required
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Estado Civil <span className="text-destructive">*</span>
                </label>
                <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                    <SelectItem value="uniao_estavel">União Estável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <FormInput
                label="E-mail"
                placeholder="seu@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur("email", email)}
                error={touched.email ? errors.email : undefined}
                success={touched.email && !errors.email && email.length > 0}
                required
              />
            </div>
          </FormCard>
        )}

        {/* Step 2: Dados do Imóvel */}
        {currentStep === 1 && (
          <FormCard title="Dados do Imóvel" description="Endereço e valores do contrato">
            <div className="space-y-5">
              <RadioCardGroup
                label="Tipo de Imóvel"
                options={[
                  { value: "casa", label: "Casa", icon: <Home size={24} /> },
                  { value: "apartamento", label: "Apartamento", icon: <Building2 size={24} /> },
                ]}
                value={propertyType}
                onChange={(val) => setPropertyType(val as "casa" | "apartamento")}
              />

              <FormInput
                label="CEP"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => {
                  const formatted = formatCEP(e.target.value);
                  setCep(formatted);
                  if (formatted.replace(/\D/g, "").length === 8) {
                    fetchAddressFromCep(formatted);
                  }
                }}
                onBlur={() => handleBlur("cep", cep)}
                inputMode="numeric"
                error={touched.cep ? errors.cep : undefined}
                success={touched.cep && !errors.cep && cep.length > 0}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <FormInput
                    label="Rua"
                    placeholder="Nome da rua"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                  />
                </div>
                <FormInput
                  label="Número"
                  placeholder="Nº"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </div>

              <FormInput
                label="Complemento"
                placeholder="Apto, bloco, etc. (opcional)"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Bairro"
                  placeholder="Seu bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  required
                />
                <FormInput
                  label="Cidade"
                  placeholder="Sua cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="border-t border-border pt-5 mt-2">
                <h3 className="font-semibold text-foreground mb-4">Valores</h3>
                <div className="space-y-4">
                  <FormInput
                    label="Aluguel"
                    placeholder="R$ 0,00"
                    value={rentValue}
                    onChange={(e) => setRentValue(formatCurrency(e.target.value))}
                    inputMode="numeric"
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput
                      label="Condomínio (opcional)"
                      placeholder="R$ 0,00"
                      value={condoValue}
                      onChange={(e) => setCondoValue(formatCurrency(e.target.value))}
                      inputMode="numeric"
                    />
                    <FormInput
                      label="IPTU (opcional)"
                      placeholder="R$ 0,00"
                      value={iptuValue}
                      onChange={(e) => setIptuValue(formatCurrency(e.target.value))}
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-5 mt-2">
                <SegmentedControl
                  label="Tempo de Contrato"
                  options={[
                    { value: "12", label: "12 meses" },
                    { value: "30", label: "30 meses" },
                  ]}
                  value={contractDuration}
                  onChange={(val) => setContractDuration(val as "12" | "30")}
                />
              </div>
            </div>
          </FormCard>
        )}
      </div>

      {/* LGPD no último step */}
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

      {/* Navigation */}
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
