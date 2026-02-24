import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Stepper, type Step } from "@/components/ui/stepper";
import { FormCard } from "@/components/ui/form-card";
import { FormInput } from "@/components/ui/form-input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Smartphone, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { buildSmartphonePayload } from "@/utils/dataProcessor";
import { usePartialLead } from "@/hooks/usePartialLead";
import { LgpdConsent } from "@/components/ui/lgpd-consent";

const steps: Step[] = [
  { id: "insured", title: "Dados do Segurado", description: "Informações pessoais" },
  { id: "address", title: "Endereço do Imóvel", description: "Localização" },
  { id: "smartphone", title: "Dados do Smartphone", description: "Valor do aparelho" },
];

const formatCEP = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{3})\d+?$/, "$1");
};

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

interface SmartphoneWizardProps {
  onComplete?: (payload: any) => void;
}

export const SmartphoneWizard: React.FC<SmartphoneWizardProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { savePartialLead, updateStepIndex, getLeadId } = usePartialLead();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // LGPD Consent
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);

  // Step 1: Dados do Segurado
  const [fullName, setFullName] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [maritalStatus, setMaritalStatus] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [profession, setProfession] = React.useState("");

  // Pré-preenchimento via sessão do portal
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('portal_client');
      if (!raw) return;
      const client = JSON.parse(raw);
      if (client.name && !fullName) setFullName(client.name);
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

  // Step 2: Endereço do Imóvel
  const [cep, setCep] = React.useState("");
  const [street, setStreet] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [complement, setComplement] = React.useState("");
  const [neighborhood, setNeighborhood] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [isVacationHome, setIsVacationHome] = React.useState(false);

  // Step 3: Dados do Smartphone
  const [smartphoneValue, setSmartphoneValue] = React.useState("");

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

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "cpf":
        const digits = value.replace(/\D/g, "");
        if (digits.length !== 11) {
          return "CPF deve ter 11 dígitos";
        }
        break;
      case "email":
        if (!value.includes("@") || !value.includes(".")) {
          return "E-mail inválido";
        }
        break;
      case "phone":
        if (value.replace(/\D/g, "").length < 10) {
          return "Telefone inválido";
        }
        break;
      case "cep":
        if (value.replace(/\D/g, "").length !== 8) {
          return "CEP deve ter 8 dígitos";
        }
        break;
    }
    return undefined;
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return (
          cpf.replace(/\D/g, "").length === 11 &&
          fullName.trim().length > 0 &&
          email.includes("@") &&
          phone.replace(/\D/g, "").length >= 10 &&
          maritalStatus.length > 0 &&
          profession.trim().length > 0 &&
          birthDate.length > 0
        );
      case 1:
        return (
          cep.replace(/\D/g, "").length === 8 &&
          street.trim().length > 0 &&
          number.trim().length > 0 &&
          neighborhood.trim().length > 0 &&
          city.trim().length > 0
        );
      case 2:
        return smartphoneValue.length > 0 && acceptedTerms && acceptedPrivacy;
      default:
        return false;
    }
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      // Salvar lead parcial quando sair do Passo 0
      if (currentStep === 0 && !getLeadId()) {
        await savePartialLead({
          name: fullName,
          email,
          phone,
          cpf,
          insuranceType: 'Residencial (Smartphone)',
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
      const payload = buildSmartphonePayload({
        fullName,
        cpf,
        birthDate,
        maritalStatus,
        email,
        phone,
        profession,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        isVacationHome,
        smartphoneValue,
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
        {/* Step 1: Dados do Segurado */}
        {currentStep === 0 && (
          <FormCard
            title="Dados do Segurado"
            description="Informe seus dados pessoais"
          >
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
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
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
            </div>
          </FormCard>
        )}

        {/* Step 2: Endereço do Imóvel */}
        {currentStep === 1 && (
          <FormCard title="Endereço do Imóvel" description="Localização da residência">
            <div className="space-y-5">
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

              <ToggleSwitch
                label="Imóvel de Veraneio"
                description="Este é um imóvel de veraneio/temporada?"
                checked={isVacationHome}
                onCheckedChange={setIsVacationHome}
              />
            </div>
          </FormCard>
        )}

        {/* Step 3: Dados do Smartphone */}
        {currentStep === 2 && (
          <FormCard
            title="Dados do Smartphone"
            description="Informe o valor do aparelho"
          >
            <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="text-primary mt-0.5" size={24} />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Cobertura para Smartphone</h4>
                    <p className="text-sm text-muted-foreground">
                      O seguro residencial pode incluir cobertura para eletrônicos portáteis,
                      protegendo seu smartphone contra roubo, furto e danos acidentais.
                    </p>
                  </div>
                </div>
              </div>

              <FormInput
                label="Valor aproximado da NF do Smartphone"
                placeholder="R$ 0,00"
                value={smartphoneValue}
                onChange={(e) => setSmartphoneValue(formatCurrency(e.target.value))}
                inputMode="numeric"
                required
              />

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-amber-800">
                  <strong>Importante:</strong> A nota fiscal do aparelho é obrigatória para que as seguradoras possam processar a indenização em caso de sinistro. Guarde-a em local seguro.
                </p>
              </div>

              <LgpdConsent
                acceptedTerms={acceptedTerms}
                acceptedPrivacy={acceptedPrivacy}
                onAcceptTermsChange={setAcceptedTerms}
                onAcceptPrivacyChange={setAcceptedPrivacy}
              />
            </div>
          </FormCard>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 gap-4">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft size={18} />
          Voltar
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button
            onClick={nextStep}
            disabled={!isStepValid(currentStep)}
            className="gap-2"
          >
            Próximo
            <ArrowRight size={18} />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!isStepValid(currentStep) || isSubmitting}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Finalizar Cotação
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
