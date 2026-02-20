import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Stepper, type Step } from "@/components/ui/stepper";
import { FormCard } from "@/components/ui/form-card";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Car,
  MapPin,
  User,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { sendToRDStation, buildEndorsementPayload } from "@/utils/dataProcessor";
import { usePartialLead } from "@/hooks/usePartialLead";
import { LgpdConsent } from "@/components/ui/lgpd-consent";

// Tipos de endosso disponíveis
type EndorsementType = "substituicao_veiculo" | "alteracao_cep" | "troca_condutor" | "cancelamento" | null;

const endorsementOptions = [
  {
    type: "substituicao_veiculo" as EndorsementType,
    label: "Substituição de Veículo",
    description: "Trocar o veículo segurado",
    icon: Car,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    type: "alteracao_cep" as EndorsementType,
    label: "Alteração de CEP",
    description: "Mudar endereço de pernoite",
    icon: MapPin,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  {
    type: "troca_condutor" as EndorsementType,
    label: "Troca de Condutor",
    description: "Alterar condutor principal",
    icon: User,
    color: "text-violet-600",
    bgColor: "bg-violet-100",
  },
  {
    type: "cancelamento" as EndorsementType,
    label: "Cancelamento",
    description: "Cancelar o seguro",
    icon: XCircle,
    color: "text-rose-600",
    bgColor: "bg-rose-100",
  },
];

// Formatação helpers
const formatCPF = (value: string) => value.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
const formatPhone = (value: string) => value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").replace(/(-\d{4})\d+?$/, "$1");
const formatCEP = (value: string) => value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").replace(/(-\d{3})\d+?$/, "$1");
const formatPlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^([A-Z]{3})([0-9A-Z])/, "$1-$2").slice(0, 8);
const formatDate = (value: string) => value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{4})\d+?$/, "$1");

interface EndorsementWizardProps {
  isUber?: boolean;
}

export const EndorsementWizard: React.FC<EndorsementWizardProps> = ({ isUber = false }) => {
  const navigate = useNavigate();
  const { savePartialLead, updateStepIndex, getLeadId } = usePartialLead();
  const [endorsementType, setEndorsementType] = React.useState<EndorsementType>(null);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // LGPD Consent
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);
  const [acceptedEndorsementTerms, setAcceptedEndorsementTerms] = React.useState(false);

  // Dados do Segurado (comum a todos)
  const [name, setName] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  // Dados do Veículo Atual (para substituição e cancelamento)
  const [currentPlate, setCurrentPlate] = React.useState("");
  const [currentModel, setCurrentModel] = React.useState("");

  // Dados do Novo Veículo (substituição)
  const [newPlate, setNewPlate] = React.useState("");
  const [newModel, setNewModel] = React.useState("");
  const [newYearModel, setNewYearModel] = React.useState("");
  const [isZeroKm, setIsZeroKm] = React.useState(false);
  const [isFinanced, setIsFinanced] = React.useState(false);

  // Novo CEP (alteração de CEP)
  const [newCep, setNewCep] = React.useState("");
  const [newStreet, setNewStreet] = React.useState("");
  const [newNumber, setNewNumber] = React.useState("");
  const [newNeighborhood, setNewNeighborhood] = React.useState("");
  const [newCity, setNewCity] = React.useState("");
  const [newState, setNewState] = React.useState("");
  const [isFetchingCep, setIsFetchingCep] = React.useState(false);

  // Novo Condutor (troca de condutor)
  const [newDriverName, setNewDriverName] = React.useState("");
  const [newDriverCpf, setNewDriverCpf] = React.useState("");
  const [newDriverBirthDate, setNewDriverBirthDate] = React.useState("");
  const [newDriverCnh, setNewDriverCnh] = React.useState("");
  const [newDriverMaritalStatus, setNewDriverMaritalStatus] = React.useState("");

  // Cancelamento
  const [cancelReason, setCancelReason] = React.useState("");

  // Busca CEP
  const fetchAddressFromCep = React.useCallback(async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setNewStreet(data.logradouro || "");
        setNewNeighborhood(data.bairro || "");
        setNewCity(data.localidade || "");
        setNewState(data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsFetchingCep(false);
    }
  }, []);

  React.useEffect(() => {
    const cleanCep = newCep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      fetchAddressFromCep(newCep);
    }
  }, [newCep, fetchAddressFromCep]);

  // Steps dinâmicos baseados no tipo de endosso
  const getSteps = (): Step[] => {
    const baseSteps: Step[] = [
      { id: "type", title: "Tipo", description: "Qual endosso?" },
      { id: "data", title: "Dados", description: "Informações" },
      { id: "terms", title: "Confirmação", description: "Termo de aceite" },
    ];
    return baseSteps;
  };

  const steps = getSteps();

  // Validação por step
  const isStepValid = (step: number): boolean => {
    if (step === 0) {
      return endorsementType !== null;
    }

    if (step === 1) {
      // Validação comum: dados do segurado
      const hasBasicData =
        name.trim().length >= 3 &&
        cpf.replace(/\D/g, "").length === 11 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
        phone.replace(/\D/g, "").length === 11;

      if (!hasBasicData) return false;

      switch (endorsementType) {
        case "substituicao_veiculo":
          return (
            currentPlate.replace(/[^A-Z0-9]/g, "").length >= 7 &&
            newModel.trim().length > 0 &&
            newYearModel.trim().length >= 4 &&
            (isZeroKm || newPlate.replace(/[^A-Z0-9]/g, "").length >= 7)
          );
        case "alteracao_cep":
          return (
            newCep.replace(/\D/g, "").length === 8 &&
            newStreet.trim().length > 0 &&
            newNumber.trim().length > 0 &&
            newCity.trim().length > 0
          );
        case "troca_condutor":
          return (
            newDriverName.trim().length >= 3 &&
            newDriverCpf.replace(/\D/g, "").length === 11 &&
            newDriverBirthDate.replace(/\D/g, "").length === 8
          );
        case "cancelamento":
          return (
            currentPlate.replace(/[^A-Z0-9]/g, "").length >= 7 &&
            currentModel.trim().length > 0
          );
        default:
          return false;
      }
    }

    if (step === 2) {
      return acceptedEndorsementTerms && acceptedTerms && acceptedPrivacy;
    }

    return false;
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      // Salvar lead parcial quando sair do Passo 1 (dados do segurado)
      if (currentStep === 1 && !getLeadId()) {
        await savePartialLead({
          name,
          email,
          phone,
          cpf,
          insuranceType: isUber ? 'Endosso Uber/Similares' : 'Endosso Auto',
          stepIndex: 2,
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
    } else if (endorsementType !== null) {
      setEndorsementType(null);
    }
  };

  const handleSubmit = async () => {
    if (!endorsementType) return;

    setIsSubmitting(true);
    try {
      const payload = buildEndorsementPayload({
        endorsementType,
        isUber,
        // Dados do segurado
        name,
        cpf,
        email,
        phone,
        // Veículo atual
        currentPlate,
        currentModel,
        // Novo veículo
        newPlate: isZeroKm ? "ZERO KM" : newPlate,
        newModel,
        newYearModel,
        isZeroKm,
        isFinanced,
        // Novo CEP
        newCep,
        newStreet,
        newNumber,
        newNeighborhood,
        newCity,
        newState,
        // Novo condutor
        newDriverName,
        newDriverCpf,
        newDriverBirthDate,
        newDriverCnh,
        newDriverMaritalStatus,
        // Cancelamento
        cancelReason,
      });

      const leadId = getLeadId();
      const success = await sendToRDStation(payload, leadId);
      if (success) navigate("/sucesso");
      else toast.error("Erro ao enviar solicitação.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Labels do tipo de endosso
  const getEndorsementLabel = () => {
    const option = endorsementOptions.find((o) => o.type === endorsementType);
    return option?.label || "Endosso";
  };

  // Termo de aceite específico por tipo
  const getEndorsementTermText = () => {
    switch (endorsementType) {
      case "cancelamento":
        return "Estou ciente de que após a solicitação e a transmissão da Proposta de cancelamento, NÃO será possível a reativação da apólice. O cancelamento é uma ação irreversível.";
      case "substituicao_veiculo":
        return "Estou ciente de que as alterações solicitadas (substituição de veículo) só terão validade após a emissão do endosso pela seguradora e que o veículo anterior deixará de ter cobertura.";
      case "alteracao_cep":
        return "Estou ciente de que a alteração de CEP de pernoite pode impactar no valor do prêmio do seguro e que as alterações só terão validade após a emissão do endosso pela seguradora.";
      case "troca_condutor":
        return "Estou ciente de que a troca do condutor principal pode impactar no valor do prêmio do seguro e que as alterações só terão validade após a emissão do endosso pela seguradora.";
      default:
        return "Estou ciente de que as alterações solicitadas só terão validade após a emissão do endosso pela seguradora.";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {endorsementType && <Stepper steps={steps} currentStep={currentStep} className="mb-8" />}

      <div className="min-h-[400px]">
        {/* STEP 0 - Seleção do Tipo de Endosso */}
        {currentStep === 0 && (
          <FormCard title="Qual tipo de endosso você precisa?" description="Selecione uma opção para continuar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {endorsementOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = endorsementType === option.type;

                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setEndorsementType(option.type)}
                    className={`group relative flex flex-col items-center justify-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 gap-3 h-36 ${
                      isSelected
                        ? `border-primary bg-primary/5 shadow-md scale-[1.02]`
                        : "border-muted bg-background hover:border-muted-foreground/30 hover:bg-muted/30"
                    }`}
                  >
                    <div className={`p-3 rounded-full ${option.bgColor} transition-colors`}>
                      <Icon size={28} className={option.color} />
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-sm block mb-1">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {endorsementType && (
              <div className="mt-6 flex justify-end">
                <Button onClick={nextStep} className="gap-2">
                  Continuar
                  <ArrowRight size={16} />
                </Button>
              </div>
            )}
          </FormCard>
        )}

        {/* STEP 1 - Formulário baseado no tipo */}
        {currentStep === 1 && (
          <FormCard title={`Dados para ${getEndorsementLabel()}`} description="Preencha as informações necessárias">
            <div className="space-y-6">
              {/* Dados do Segurado - comum a todos */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground border-b pb-2">Dados do Segurado</h3>
                <FormInput
                  label="Nome Completo"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="CPF"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    inputMode="numeric"
                    required
                  />
                  <FormInput
                    label="Celular"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    inputMode="tel"
                    required
                  />
                </div>
                <FormInput
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  required
                />
              </div>

              {/* SUBSTITUIÇÃO DE VEÍCULO */}
              {endorsementType === "substituicao_veiculo" && (
                <>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Veículo Atual (a ser substituído)</h3>
                    <FormInput
                      label="Placa do Veículo Atual"
                      placeholder="ABC-1D23"
                      value={currentPlate}
                      onChange={(e) => setCurrentPlate(formatPlate(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Novo Veículo</h3>
                    <FormInput
                      label="Modelo do Novo Veículo"
                      placeholder="Ex: Honda Civic EX 2024"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Ano/Modelo"
                        placeholder="2024/2024"
                        value={newYearModel}
                        onChange={(e) => setNewYearModel(e.target.value)}
                        required
                      />
                      <FormInput
                        label={isZeroKm ? "Placa (não obrigatório)" : "Placa do Novo Veículo"}
                        placeholder="ABC-1D23"
                        value={newPlate}
                        onChange={(e) => setNewPlate(formatPlate(e.target.value))}
                        disabled={isZeroKm}
                        required={!isZeroKm}
                      />
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={isZeroKm} onCheckedChange={(checked) => setIsZeroKm(checked === true)} />
                        <span className="text-sm">Zero KM</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={isFinanced} onCheckedChange={(checked) => setIsFinanced(checked === true)} />
                        <span className="text-sm">Financiado/Alienado</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* ALTERAÇÃO DE CEP */}
              {endorsementType === "alteracao_cep" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground border-b pb-2">Novo Endereço de Pernoite</h3>
                  <FormInput
                    label="Novo CEP"
                    placeholder="00000-000"
                    value={newCep}
                    onChange={(e) => setNewCep(formatCEP(e.target.value))}
                    inputMode="numeric"
                    required
                  />
                  {isFetchingCep && <p className="text-sm text-muted-foreground">Buscando endereço...</p>}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <FormInput
                        label="Rua"
                        placeholder="Rua, Avenida, etc"
                        value={newStreet}
                        onChange={(e) => setNewStreet(e.target.value)}
                        required
                      />
                    </div>
                    <FormInput
                      label="Número"
                      placeholder="123"
                      value={newNumber}
                      onChange={(e) => setNewNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput
                      label="Bairro"
                      placeholder="Bairro"
                      value={newNeighborhood}
                      onChange={(e) => setNewNeighborhood(e.target.value)}
                      required
                    />
                    <FormInput
                      label="Cidade"
                      placeholder="Cidade"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      required
                    />
                    <FormInput
                      label="Estado"
                      placeholder="UF"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value.toUpperCase().slice(0, 2))}
                      required
                    />
                  </div>
                </div>
              )}

              {/* TROCA DE CONDUTOR */}
              {endorsementType === "troca_condutor" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground border-b pb-2">Dados do Novo Condutor Principal</h3>
                  <FormInput
                    label="Nome Completo"
                    placeholder="Nome do novo condutor"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    required
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="CPF"
                      placeholder="000.000.000-00"
                      value={newDriverCpf}
                      onChange={(e) => setNewDriverCpf(formatCPF(e.target.value))}
                      inputMode="numeric"
                      required
                    />
                    <FormInput
                      label="Data de Nascimento"
                      placeholder="DD/MM/AAAA"
                      value={newDriverBirthDate}
                      onChange={(e) => setNewDriverBirthDate(formatDate(e.target.value))}
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="CNH (opcional)"
                      placeholder="Número da CNH"
                      value={newDriverCnh}
                      onChange={(e) => setNewDriverCnh(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                    />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Estado Civil (opcional)</Label>
                      <select
                        value={newDriverMaritalStatus}
                        onChange={(e) => setNewDriverMaritalStatus(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="solteiro">Solteiro(a)</option>
                        <option value="casado">Casado(a)</option>
                        <option value="divorciado">Divorciado(a)</option>
                        <option value="viuvo">Viúvo(a)</option>
                        <option value="uniao_estavel">União Estável</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* CANCELAMENTO */}
              {endorsementType === "cancelamento" && (
                <>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Dados do Veículo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Placa do Veículo"
                        placeholder="ABC-1D23"
                        value={currentPlate}
                        onChange={(e) => setCurrentPlate(formatPlate(e.target.value))}
                        required
                      />
                      <FormInput
                        label="Modelo do Veículo"
                        placeholder="Ex: Honda Civic EX"
                        value={currentModel}
                        onChange={(e) => setCurrentModel(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Motivo do Cancelamento (opcional)</h3>
                    <Textarea
                      placeholder="Informe o motivo do cancelamento, se desejar..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Aviso de Cancelamento */}
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-rose-800">
                      <strong>Atenção:</strong> O cancelamento do seguro é uma ação irreversível. Após a transmissão da proposta de cancelamento, não será possível reativar a apólice.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Navegação */}
            <div className="mt-8 flex justify-between">
              <Button type="button" variant="ghost" onClick={prevStep} className="gap-2">
                <ArrowLeft size={16} />
                Voltar
              </Button>
              <Button onClick={nextStep} disabled={!isStepValid(1)} className="gap-2">
                Continuar
                <ArrowRight size={16} />
              </Button>
            </div>
          </FormCard>
        )}

        {/* STEP 2 - Termo de Aceite */}
        {currentStep === 2 && (
          <FormCard title="Termo de Aceite" description="Leia e aceite os termos para continuar">
            <div className="space-y-6">
              {/* Termo específico do endosso */}
              <div className={`p-4 rounded-lg border-2 ${endorsementType === "cancelamento" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="endorsement-terms"
                    checked={acceptedEndorsementTerms}
                    onCheckedChange={(checked) => setAcceptedEndorsementTerms(checked === true)}
                  />
                  <label htmlFor="endorsement-terms" className="text-sm leading-relaxed cursor-pointer">
                    {getEndorsementTermText()}
                  </label>
                </div>
              </div>

              {/* LGPD */}
              <LgpdConsent
                acceptedTerms={acceptedTerms}
                acceptedPrivacy={acceptedPrivacy}
                onAcceptTermsChange={setAcceptedTerms}
                onAcceptPrivacyChange={setAcceptedPrivacy}
              />
            </div>

            {/* Navegação */}
            <div className="mt-8 flex justify-between">
              <Button type="button" variant="ghost" onClick={prevStep} className="gap-2">
                <ArrowLeft size={16} />
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid(2) || isSubmitting}
                className={`gap-2 ${endorsementType === "cancelamento" ? "bg-rose-600 hover:bg-rose-700" : ""}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    {endorsementType === "cancelamento" ? "Solicitar Cancelamento" : "Enviar Solicitação"}
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </div>
          </FormCard>
        )}
      </div>
    </div>
  );
};
