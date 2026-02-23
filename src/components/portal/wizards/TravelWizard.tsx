import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Stepper, type Step } from "@/components/ui/stepper";
import { FormCard } from "@/components/ui/form-card";
import { FormInput } from "@/components/ui/form-input";
import { RadioCardGroup } from "@/components/ui/radio-card";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildTravelPayload } from "@/utils/dataProcessor";
import { usePartialLead } from "@/hooks/usePartialLead";
import { LgpdConsent } from "@/components/ui/lgpd-consent";

const steps: Step[] = [
  { id: "destination", title: "Destino", description: "Para onde vai" },
  { id: "dates", title: "Período", description: "Datas da viagem" },
  { id: "travelers", title: "Viajantes", description: "Quem vai viajar" },
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

interface Traveler {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
}

interface TravelWizardProps {
  onComplete?: (payload: any) => void;
}

export const TravelWizard: React.FC<TravelWizardProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { savePartialLead, updateStepIndex, getLeadId } = usePartialLead();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // LGPD Consent
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);

  // Step 1: Destination
  const [destinationType, setDestinationType] = React.useState("international");
  const [destination, setDestination] = React.useState("");
  const [tripPurpose, setTripPurpose] = React.useState("tourism");

  // Step 2: Dates
  const [departureDate, setDepartureDate] = React.useState("");
  const [returnDate, setReturnDate] = React.useState("");
  const [wantCancellationCoverage, setWantCancellationCoverage] = React.useState(true);
  const [wantLuggageCoverage, setWantLuggageCoverage] = React.useState(true);

  // Step 3: Travelers
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [travelers, setTravelers] = React.useState<Traveler[]>([
    { id: "1", name: "", cpf: "", birthDate: "" },
  ]);

  // Pré-preenchimento via sessão do portal
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('portal_client');
      if (!raw) return;
      const client = JSON.parse(raw);
      if (client.phone && !contactPhone) setContactPhone(formatPhone(client.phone));
      if (client.email && !contactEmail) setContactEmail(client.email);
      // Preencher primeiro viajante
      if (client.name || client.cpf_cnpj) {
        setTravelers(prev => {
          const first = prev[0];
          if (!first) return prev;
          const updated = { ...first };
          if (client.name && !updated.name) updated.name = client.name;
          if (client.cpf_cnpj && !updated.cpf) {
            const digits = client.cpf_cnpj.replace(/\D/g, '');
            if (digits.length <= 11) updated.cpf = formatCPF(client.cpf_cnpj);
          }
          return [updated, ...prev.slice(1)];
        });
      }
    } catch (e) {
      console.error('Erro ao pré-preencher:', e);
    }
  }, []);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const newErrors = { ...errors };

    if (field === "contactEmail" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      newErrors.contactEmail = "E-mail inválido";
    } else {
      delete newErrors.contactEmail;
    }

    if (field === "contactPhone" && value.replace(/\D/g, "").length < 11) {
      newErrors.contactPhone = "Telefone deve ter 11 dígitos";
    } else {
      delete newErrors.contactPhone;
    }

    setErrors(newErrors);
  };

  const addTraveler = () => {
    setTravelers([
      ...travelers,
      { id: Date.now().toString(), name: "", cpf: "", birthDate: "" },
    ]);
  };

  const removeTraveler = (id: string) => {
    if (travelers.length > 1) {
      setTravelers(travelers.filter((t) => t.id !== id));
    }
  };

  const updateTraveler = (id: string, field: keyof Traveler, value: string) => {
    setTravelers(
      travelers.map((t) =>
        t.id === id
          ? { ...t, [field]: field === "cpf" ? formatCPF(value) : value }
          : t
      )
    );
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return destinationType && destination.trim().length > 0 && tripPurpose;
      case 1:
        return departureDate && returnDate && new Date(returnDate) > new Date(departureDate);
      case 2:
        return (
          contactPhone.replace(/\D/g, "").length >= 11 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) &&
          travelers.every(
            (t) =>
              t.name.trim().length >= 3 &&
              t.cpf.replace(/\D/g, "").length === 11 &&
              t.birthDate.length > 0
          )
        );
      default:
        return false;
    }
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      // Para TravelWizard, os dados de contato ficam no último passo
      // Então não salvamos lead parcial aqui, pois não temos email ainda nos passos 0 e 1
      if (getLeadId()) {
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
      // Salvar lead parcial antes do envio final (se não foi salvo ainda)
      let leadId = getLeadId();
      if (!leadId && travelers[0]) {
        leadId = await savePartialLead({
          name: travelers[0].name,
          email: contactEmail,
          phone: contactPhone,
          cpf: travelers[0].cpf,
          insuranceType: 'Seguro Viagem',
          stepIndex: 2,
        });
      }

      const payload = buildTravelPayload(
        {
          email: contactEmail,
          phone: contactPhone,
          destination,
          destinationType,
          departureDate,
          returnDate,
          tripPurpose,
          coverageMedical: true,
          coverageBaggage: wantLuggageCoverage,
          coverageCancellation: wantCancellationCoverage,
        },
        travelers
      );

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
            title="Destino da Viagem"
            description="Para onde você está indo?"
          >
            <div className="space-y-5">
              <RadioCardGroup
                label="Tipo de Viagem"
                options={[
                  { value: "national", label: "Nacional", description: "Dentro do Brasil" },
                  { value: "international", label: "Internacional", description: "Fora do Brasil" },
                ]}
                value={destinationType}
                onChange={setDestinationType}
              />

              <FormInput
                label="Destino"
                placeholder={
                  destinationType === "national"
                    ? "Ex: Rio de Janeiro, Bahia"
                    : "Ex: Estados Unidos, Europa"
                }
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />

              <RadioCardGroup
                label="Motivo da Viagem"
                options={[
                  { value: "tourism", label: "Turismo", description: "Lazer e passeios" },
                  { value: "business", label: "Negócios", description: "Trabalho" },
                  { value: "study", label: "Estudos", description: "Intercâmbio" },
                  { value: "sports", label: "Esportes", description: "Competições" },
                ]}
                value={tripPurpose}
                onChange={setTripPurpose}
              />
            </div>
          </FormCard>
        )}

        {currentStep === 1 && (
          <FormCard
            title="Período da Viagem"
            description="Quando você vai viajar?"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Data de Ida"
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  required
                />
                <FormInput
                  label="Data de Volta"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  required
                />
              </div>

              {departureDate && returnDate && new Date(returnDate) > new Date(departureDate) && (
                <p className="text-sm text-muted-foreground">
                  Duração:{" "}
                  {Math.ceil(
                    (new Date(returnDate).getTime() - new Date(departureDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                  )}{" "}
                  dias
                </p>
              )}

              <ToggleSwitch
                label="Cobertura de Cancelamento"
                description="Reembolso em caso de cancelamento da viagem"
                checked={wantCancellationCoverage}
                onCheckedChange={setWantCancellationCoverage}
              />

              <ToggleSwitch
                label="Cobertura de Bagagem"
                description="Proteção contra extravio ou danos à bagagem"
                checked={wantLuggageCoverage}
                onCheckedChange={setWantLuggageCoverage}
              />
            </div>
          </FormCard>
        )}

        {currentStep === 2 && (
          <FormCard
            title="Viajantes"
            description="Dados de quem vai viajar"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Celular de Contato"
                  placeholder="(00) 00000-0000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(formatPhone(e.target.value))}
                  onBlur={() => handleBlur("contactPhone", contactPhone)}
                  inputMode="tel"
                  error={touched.contactPhone ? errors.contactPhone : undefined}
                  success={touched.contactPhone && !errors.contactPhone && contactPhone.length > 0}
                  required
                />
                <FormInput
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  onBlur={() => handleBlur("contactEmail", contactEmail)}
                  error={touched.contactEmail ? errors.contactEmail : undefined}
                  success={touched.contactEmail && !errors.contactEmail && contactEmail.length > 0}
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Viajantes ({travelers.length})
                  </label>
                  <Button
                    type="button"
                    variant="outline-subtle"
                    size="sm"
                    onClick={addTraveler}
                    className="gap-1"
                  >
                    <Plus size={16} />
                    Adicionar
                  </Button>
                </div>

                {travelers.map((traveler, index) => (
                  <div
                    key={traveler.id}
                    className="p-4 rounded-xl border border-border bg-muted/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        Viajante {index + 1}
                      </span>
                      {travelers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTraveler(traveler.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>

                    <FormInput
                      label="Nome Completo"
                      placeholder="Nome do viajante"
                      value={traveler.name}
                      onChange={(e) => updateTraveler(traveler.id, "name", e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormInput
                        label="CPF"
                        placeholder="000.000.000-00"
                        value={traveler.cpf}
                        onChange={(e) => updateTraveler(traveler.id, "cpf", e.target.value)}
                        inputMode="numeric"
                        required
                      />
                      <FormInput
                        label="Data de Nascimento"
                        type="date"
                        value={traveler.birthDate}
                        onChange={(e) => updateTraveler(traveler.id, "birthDate", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
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
