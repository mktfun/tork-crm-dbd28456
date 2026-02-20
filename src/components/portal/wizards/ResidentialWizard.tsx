import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Stepper, type Step } from "@/components/ui/stepper";
import { FormCard } from "@/components/ui/form-card";
import { FormInput } from "@/components/ui/form-input";
import { RadioCardGroup } from "@/components/ui/radio-card";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Home, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildResidentialPayload } from "@/utils/dataProcessor";
import { usePartialLead } from "@/hooks/usePartialLead";
import { LgpdConsent } from "@/components/ui/lgpd-consent";

const steps: Step[] = [
  { id: "insured", title: "Dados do Segurado", description: "Informações pessoais" },
  { id: "property", title: "Tipo de Imóvel", description: "Características" },
  { id: "address", title: "Endereço", description: "Localização" },
  { id: "coverage", title: "Cobertura", description: "Valores e opções" },
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

const formatCNPJ = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
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

interface ResidentialWizardProps {
  onComplete?: (payload: any) => void;
}

export const ResidentialWizard: React.FC<ResidentialWizardProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { savePartialLead, updateStepIndex, getLeadId } = usePartialLead();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // LGPD Consent
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);

  // Step 1: Dados do Segurado
  const [personType, setPersonType] = React.useState("pf");
  const [cpfCnpj, setCpfCnpj] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [maritalStatus, setMaritalStatus] = React.useState("");
  const [profession, setProfession] = React.useState("");

  // Step 2: Property Type
  const [propertyType, setPropertyType] = React.useState("house");
  const [ownershipType, setOwnershipType] = React.useState("owner");
  const [hasAlarm, setHasAlarm] = React.useState(false);
  const [hasGatedCommunity, setHasGatedCommunity] = React.useState(false);

  // Step 3: Address
  const [cep, setCep] = React.useState("");
  const [street, setStreet] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [complement, setComplement] = React.useState("");
  const [neighborhood, setNeighborhood] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");

  // Step 4: Coverage
  const [wantTheftCoverage, setWantTheftCoverage] = React.useState(true);
  const [wantFireCoverage, setWantFireCoverage] = React.useState(true);
  const [reconstructionValue, setReconstructionValue] = React.useState("");
  const [contentsValue, setContentsValue] = React.useState("");
  const [wantPortableElectronics, setWantPortableElectronics] = React.useState(false);
  const [portableElectronicsValue, setPortableElectronicsValue] = React.useState("");
  const [wantNewValueCoverage, setWantNewValueCoverage] = React.useState(false);

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
      case "cpfCnpj":
        const digits = value.replace(/\D/g, "");
        if (personType === "pf" && digits.length !== 11) {
          return "CPF deve ter 11 dígitos";
        }
        if (personType === "pj" && digits.length !== 14) {
          return "CNPJ deve ter 14 dígitos";
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
        const cpfCnpjValid = personType === "pf"
          ? cpfCnpj.replace(/\D/g, "").length === 11
          : cpfCnpj.replace(/\D/g, "").length === 14;
        return (
          cpfCnpjValid &&
          fullName.trim().length > 0 &&
          email.includes("@") &&
          phone.replace(/\D/g, "").length >= 10 &&
          maritalStatus.length > 0 &&
          profession.trim().length > 0
        );
      case 1:
        return propertyType && ownershipType;
      case 2:
        return (
          cep.replace(/\D/g, "").length === 8 &&
          street.trim().length > 0 &&
          number.trim().length > 0 &&
          neighborhood.trim().length > 0 &&
          city.trim().length > 0
        );
      case 3:
        if (reconstructionValue.length === 0 || contentsValue.length === 0) {
          return false;
        }
        if (wantPortableElectronics && portableElectronicsValue.length === 0) {
          return false;
        }
        return true;
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
          cpf: personType === "pf" ? cpfCnpj : undefined,
          cnpj: personType === "pj" ? cpfCnpj : undefined,
          personType,
          insuranceType: 'Seguro Residencial',
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
      const payload = buildResidentialPayload({
        personType,
        cpfCnpj,
        fullName,
        email,
        phone,
        maritalStatus,
        profession,
        propertyType,
        ownershipType,
        hasAlarm,
        hasGatedCommunity,
        cep,
        street,
        number,
        neighborhood,
        city,
        state,
        reconstructionValue,
        contentsValue,
        coverageTheft: wantTheftCoverage,
        coverageFire: wantFireCoverage,
        coverageElectronics: wantPortableElectronics,
        portableElectronicsValue: wantPortableElectronics ? portableElectronicsValue : undefined,
        coverageNewValue: wantNewValueCoverage,
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
        {/* Step 1: Dados do Segurado */}
        {currentStep === 0 && (
          <FormCard
            title="Dados do Segurado"
            description="Informe seus dados pessoais"
          >
            <div className="space-y-5">
              <SegmentedControl
                label="Tipo de Pessoa"
                options={[
                  { value: "pf", label: "Pessoa Física", description: "CPF" },
                  { value: "pj", label: "Pessoa Jurídica", description: "CNPJ" },
                ]}
                value={personType}
                onChange={(val) => {
                  setPersonType(val);
                  setCpfCnpj("");
                }}
              />

              <FormInput
                label={personType === "pf" ? "CPF" : "CNPJ"}
                placeholder={personType === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                value={cpfCnpj}
                onChange={(e) =>
                  setCpfCnpj(personType === "pf" ? formatCPF(e.target.value) : formatCNPJ(e.target.value))
                }
                onBlur={() => handleBlur("cpfCnpj", cpfCnpj)}
                inputMode="numeric"
                error={touched.cpfCnpj ? errors.cpfCnpj : undefined}
                success={touched.cpfCnpj && !errors.cpfCnpj && cpfCnpj.length > 0}
                required
              />

              <FormInput
                label={personType === "pf" ? "Nome Completo" : "Razão Social"}
                placeholder={personType === "pf" ? "Seu nome completo" : "Razão social da empresa"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

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
                label="Profissão"
                placeholder="Sua profissão"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                required
              />
            </div>
          </FormCard>
        )}

        {/* Step 2: Tipo de Imóvel */}
        {currentStep === 1 && (
          <FormCard
            title="Tipo de Imóvel"
            description="Informe as características do imóvel"
          >
            <div className="space-y-5">
              <RadioCardGroup
                label="Tipo de Residência"
                options={[
                  { value: "house", label: "Casa", icon: <Home size={24} /> },
                  { value: "apartment", label: "Apartamento", icon: <Building2 size={24} /> },
                ]}
                value={propertyType}
                onChange={setPropertyType}
              />

              <RadioCardGroup
                label="Você é"
                options={[
                  { value: "owner", label: "Proprietário", description: "Dono do imóvel" },
                  { value: "tenant", label: "Inquilino", description: "Aluga o imóvel" },
                ]}
                value={ownershipType}
                onChange={setOwnershipType}
              />

              <ToggleSwitch
                label="Sistema de Alarme"
                description="O imóvel possui alarme monitorado?"
                checked={hasAlarm}
                onCheckedChange={setHasAlarm}
              />

              <ToggleSwitch
                label="Condomínio Fechado"
                description="O imóvel está em condomínio com portaria?"
                checked={hasGatedCommunity}
                onCheckedChange={setHasGatedCommunity}
              />
            </div>
          </FormCard>
        )}

        {/* Step 3: Endereço */}
        {currentStep === 2 && (
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
            </div>
          </FormCard>
        )}

        {/* Step 4: Cobertura */}
        {currentStep === 3 && (
          <FormCard
            title="Cobertura Desejada"
            description="Selecione as coberturas"
          >
            <div className="space-y-5">
              <ToggleSwitch
                label="Cobertura contra Roubo/Furto"
                description="Proteção para bens dentro do imóvel"
                checked={wantTheftCoverage}
                onCheckedChange={setWantTheftCoverage}
              />

              <ToggleSwitch
                label="Cobertura de Incêndio/Raio/Explosão"
                description="Proteção contra incêndio, queda de raio e explosões"
                checked={wantFireCoverage}
                onCheckedChange={setWantFireCoverage}
              />

              <FormInput
                label="Valor de Reconstrução da Residência"
                placeholder="R$ 0,00"
                value={reconstructionValue}
                onChange={(e) => setReconstructionValue(formatCurrency(e.target.value))}
                inputMode="numeric"
                required
              />

              <FormInput
                label="Valor do Conteúdo de dentro da Residência"
                placeholder="R$ 0,00"
                value={contentsValue}
                onChange={(e) => setContentsValue(formatCurrency(e.target.value))}
                inputMode="numeric"
                required
              />

              {/* Zurich Exclusive */}
              <div className="relative">
                <div className="absolute -top-2 right-3 z-10">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                    </svg>
                    Exclusivo Zurich
                  </span>
                </div>
                <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-0.5">
                  <ToggleSwitch
                    label="Eletrônicos Portáteis"
                    description="Notebooks, celulares e tablets protegidos mesmo fora de casa"
                    checked={wantPortableElectronics}
                    onCheckedChange={setWantPortableElectronics}
                  />
                </div>
              </div>

              {wantPortableElectronics && (
                <FormInput
                  label="Qual valor de NF do(s) Eletrônico(s) Portátil(eis)?"
                  placeholder="R$ 0,00"
                  value={portableElectronicsValue}
                  onChange={(e) => setPortableElectronicsValue(formatCurrency(e.target.value))}
                  inputMode="numeric"
                  hint="Valor total conforme nota fiscal"
                  required
                />
              )}

              <ToggleSwitch
                label="Deseja contratar cobertura com valor de Novo?"
                description="Indenização pelo valor de bem novo, sem depreciação"
                checked={wantNewValueCoverage}
                onCheckedChange={setWantNewValueCoverage}
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
