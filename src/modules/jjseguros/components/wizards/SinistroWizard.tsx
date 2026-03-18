import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Stepper, type Step } from "@/modules/jjseguros/components/ui/stepper";
import { FormCard } from "@/modules/jjseguros/components/ui/form-card";
import { FormInput } from "@/modules/jjseguros/components/ui/form-input";
import { Button } from "@/modules/jjseguros/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/modules/jjseguros/components/ui/select";
import { Textarea } from "@/modules/jjseguros/components/ui/textarea";
import { ArrowLeft, ArrowRight, Loader2, AlertTriangle, FileText, UserCircle, Car, MapPin, CheckCircle2 } from "lucide-react";
import { YesNoToggle } from "@/modules/jjseguros/components/ui/yes-no-toggle";
import { toast } from "sonner";
import { sendToRDStation, buildSinistroPayload } from "@/modules/jjseguros/utils/dataProcessor";
import { usePartialLead } from "@/modules/jjseguros/hooks/usePartialLead";
import { LgpdConsent } from "@/modules/jjseguros/components/ui/lgpd-consent";

// Formatação helpers
const formatCPF = (value: string) => value.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
const formatCNPJ = (value: string) => value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
const formatPhone = (value: string) => value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").replace(/(-\d{4})\d+?$/, "$1");
const formatPlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^([A-Z]{3})([0-9A-Z])/, "$1-$2").slice(0, 8);
const formatDate = (value: string) => value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{4})\d+?$/, "$1");
const formatTime = (value: string) => value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1:$2").replace(/(:\d{2})\d+?$/, "$1");
const formatYearModel = (value: string) => value.replace(/\D/g, "").replace(/(\d{4})(\d)/, "$1/$2").replace(/(\/\d{4})\d+?$/, "$1");

export const SinistroWizard: React.FC = () => {
  const navigate = useNavigate();
  const { savePartialLead, updateStepIndex, getLeadId } = usePartialLead();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Consentimentos
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = React.useState(false);

  // STEP 1: Segurado/Veículo e Condutor
  const [vehicleModel, setVehicleModel] = React.useState("");
  const [vehiclePlate, setVehiclePlate] = React.useState("");
  const [vehicleYearModel, setVehicleYearModel] = React.useState("");
  
  const [driverName, setDriverName] = React.useState("");
  const [driverCpf, setDriverCpf] = React.useState("");
  const [driverBirth, setDriverBirth] = React.useState("");
  const [driverMaritalStatus, setDriverMaritalStatus] = React.useState("");
  const [driverEmail, setDriverEmail] = React.useState("");
  const [driverPhone, setDriverPhone] = React.useState("");
  const [driverCnh, setDriverCnh] = React.useState("");
  const [driverCnhValidity, setDriverCnhValidity] = React.useState("");

  // STEP 2: Ocorrência e Oficina
  const [eventDate, setEventDate] = React.useState("");
  const [eventTime, setEventTime] = React.useState("");
  const [eventLocation, setEventLocation] = React.useState("");
  const [eventReport, setEventReport] = React.useState("");

  const [workshopName, setWorkshopName] = React.useState("");
  const [workshopCnpj, setWorkshopCnpj] = React.useState("");
  const [workshopAddress, setWorkshopAddress] = React.useState("");
  const [workshopPhone, setWorkshopPhone] = React.useState("");

  // STEP 3: Terceiros
  const [hasThirdParty, setHasThirdParty] = React.useState<"sim" | "nao" | null>(null);
  
  const [thirdName, setThirdName] = React.useState("");
  const [thirdCpf, setThirdCpf] = React.useState("");
  const [thirdBirth, setThirdBirth] = React.useState("");
  const [thirdMaritalStatus, setThirdMaritalStatus] = React.useState("");
  const [thirdEmail, setThirdEmail] = React.useState("");
  const [thirdAddress, setThirdAddress] = React.useState("");
  const [thirdCnh, setThirdCnh] = React.useState("");
  const [thirdCnhValidity, setThirdCnhValidity] = React.useState("");

  const steps: Step[] = [
    { id: "condutor", title: "Condutor & Veículo", description: "Dados do seu carro e quem estava dirigindo" },
    { id: "ocorrencia", title: "Ocorrência", description: "Onde, quando, e para qual oficina" },
    { id: "terceiros", title: "Terceiros", description: "Envolveu outros veículos?" },
    { id: "confirmacao", title: "Confirmação", description: "Revisão e envio" },
  ];

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return (
          vehicleModel.trim().length > 0 &&
          vehiclePlate.replace(/[^A-Z0-9]/g, "").length >= 7 &&
          vehicleYearModel.length === 9 && // e.g: 2024/2025
          driverName.trim().length >= 3 &&
          driverCpf.replace(/\D/g, "").length === 11 &&
          driverBirth.replace(/\D/g, "").length === 8 &&
          driverMaritalStatus.length > 0 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverEmail) &&
          driverPhone.replace(/\D/g, "").length >= 10 &&
          driverCnh.trim().length > 0 &&
          driverCnhValidity.replace(/\D/g, "").length >= 6 // Ex: 10/2030 ou 10/10/2030
        );
      case 1:
        return (
          eventDate.replace(/\D/g, "").length === 8 &&
          eventTime.replace(/\D/g, "").length === 4 &&
          eventLocation.trim().length > 0 &&
          eventReport.trim().length >= 10 &&
          workshopName.trim().length > 0 &&
          workshopCnpj.replace(/\D/g, "").length === 14 &&
          workshopAddress.trim().length > 0 &&
          workshopPhone.replace(/\D/g, "").length >= 10
        );
      case 2:
        if (hasThirdParty === null) return false;
        if (hasThirdParty === "nao") return true;
        return (
          thirdName.trim().length >= 3 &&
          thirdCpf.replace(/\D/g, "").length === 11 &&
          thirdBirth.replace(/\D/g, "").length === 8 &&
          thirdMaritalStatus.length > 0 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(thirdEmail) &&
          thirdAddress.trim().length > 0 &&
          thirdCnh.trim().length > 0 &&
          thirdCnhValidity.replace(/\D/g, "").length >= 6
        );
      case 3:
        return acceptedTerms && acceptedPrivacy;
      default:
        return false;
    }
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      if (currentStep === 0 && !getLeadId()) {
        await savePartialLead({
          name: driverName,
          email: driverEmail,
          phone: driverPhone,
          cpf: driverCpf,
          insuranceType: 'Aviso de Sinistro',
          stepIndex: 1,
        });
      } else if (getLeadId()) {
        await updateStepIndex(currentStep + 1);
      }
      
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!isStepValid(3)) return;

    setIsSubmitting(true);
    try {
      const formData = {
        // Veículo
        vehicleModel,
        vehiclePlate,
        vehicleYearModel,
        
        // Condutor
        driverName,
        driverCpf,
        driverBirth,
        driverMaritalStatus,
        driverEmail,
        driverPhone,
        driverCnh,
        driverCnhValidity,

        // Ocorrência
        eventDate,
        eventTime,
        eventLocation,
        eventReport,

        // Oficina
        workshopName,
        workshopCnpj,
        workshopAddress,
        workshopPhone,

        // Terceiro
        hasThirdParty: hasThirdParty === "sim",
        thirdName,
        thirdCpf,
        thirdBirth,
        thirdMaritalStatus,
        thirdEmail,
        thirdAddress,
        thirdCnh,
        thirdCnhValidity,
      };

      const payload = buildSinistroPayload(formData);
      
      const response = await sendToRDStation(payload);

      if (response) {
        toast.success("Sinistro reportado com sucesso!", {
          description: "Entraremos em contato o mais breve possível.",
        });
        
        // Redireciona para sucesso com indicação de que precisa mandar a CNH do terceiro (se houver)
        navigate(`/sucesso?sinistro=true&terceiro=${hasThirdParty === "sim"}`, { replace: true });
      } else {
        throw new Error("Erro ao conectar com o servidor");
      }
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast.error("Erro ao enviar aviso de sinistro", {
        description: "Por favor, tente novamente ou nos chame no WhatsApp.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      <div className="bg-muted/50 border border-border p-4 rounded-xl mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-foreground/80 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-foreground text-sm">Aviso Importante</h3>
            <p className="text-sm text-muted-foreground mt-1">
              As informações fornecidas devem ser estritamente reais. Qualquer divergência não confirmada pode implicar na negativa da indenização por parte da seguradora.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card shadow-sm border border-border/50 rounded-2xl p-4 sm:p-6 mb-8 overflow-x-auto">
        <div className="min-w-[400px]">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>
      </div>

      {currentStep === 0 && (
        <div className="space-y-6 animate-slide-in">
          <FormCard title="Veículo Segurado" description="Identificação do carro do seguro">
            <div className="space-y-5">
              <FormInput
                label="Modelo do Veículo *"
                placeholder="Ex: Honda Civic EX"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Placa *"
                  placeholder="Ex: ABC-1D23"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(formatPlate(e.target.value))}
                  required
                />
                <FormInput
                  label="Ano Fabricação / Ano Modelo *"
                  placeholder="Ex: 2024/2025"
                  value={vehicleYearModel}
                  onChange={(e) => setVehicleYearModel(formatYearModel(e.target.value))}
                  required
                />
              </div>
            </div>
          </FormCard>

          <FormCard title="Condutor" description="Quem estava dirigindo no momento do sinistro?">
            <div className="space-y-5">
              <FormInput
                label="Nome Completo *"
                placeholder="Seu nome completo"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                required
              />
              <FormInput
                label="CPF *"
                placeholder="000.000.000-00"
                value={driverCpf}
                onChange={(e) => setDriverCpf(formatCPF(e.target.value))}
                inputMode="numeric"
                required
              />
              <FormInput
                label="Data de Nascimento *"
                placeholder="DD/MM/AAAA"
                value={driverBirth}
                onChange={(e) => setDriverBirth(formatDate(e.target.value))}
                inputMode="numeric"
                required
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado Civil *</label>
                <Select value={driverMaritalStatus} onValueChange={setDriverMaritalStatus}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                    <SelectItem value="casado">Casado(a) / União Estável</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormInput
                label="E-mail *"
                type="email"
                placeholder="seu@email.com"
                value={driverEmail}
                onChange={(e) => setDriverEmail(e.target.value)}
                required
              />
              <FormInput
                label="Telefone / Celular *"
                placeholder="(00) 00000-0000"
                value={driverPhone}
                onChange={(e) => setDriverPhone(formatPhone(e.target.value))}
                inputMode="numeric"
                required
              />
              <FormInput
                label="Número da CNH *"
                placeholder="Ex: 12345678900"
                value={driverCnh}
                onChange={(e) => setDriverCnh(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                required
              />
              <FormInput
                label="Validade da CNH *"
                placeholder="DD/MM/AAAA"
                value={driverCnhValidity}
                onChange={(e) => setDriverCnhValidity(formatDate(e.target.value))}
                inputMode="numeric"
                required
              />
            </div>
          </FormCard>
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-6 animate-slide-in">
          <FormCard title="Ocorrência" description="Detalhes de como e onde aconteceu">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Data do Evento *"
                  placeholder="DD/MM/AAAA"
                  value={eventDate}
                  onChange={(e) => setEventDate(formatDate(e.target.value))}
                  inputMode="numeric"
                  required
                />
                <FormInput
                  label="Hora do Evento *"
                  placeholder="HH:MM"
                  value={eventTime}
                  onChange={(e) => setEventTime(formatTime(e.target.value))}
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <FormInput
                  label="Local / Endereço Completo *"
                  placeholder="Rua, Número, Bairro, Cidade, Estado"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium">Relato breve de como aconteceu *</label>
                <Textarea
                  placeholder="Descreva de forma clara e resumida a dinâmica do acidente ou evento..."
                  value={eventReport}
                  onChange={(e) => setEventReport(e.target.value)}
                  className="min-h-[120px] bg-background border-input focus:ring-2 focus:ring-primary/20 resize-y"
                />
              </div>
            </div>
          </FormCard>

          <FormCard title="Oficina" description="Para onde o carro foi ou será levado?">
            <div className="space-y-5">
              <FormInput
                label="Razão Social / Nome da Oficina *"
                placeholder="Ex: Oficina do João LTDA"
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="CNPJ *"
                  placeholder="00.000.000/0000-00"
                  value={workshopCnpj}
                  onChange={(e) => setWorkshopCnpj(formatCNPJ(e.target.value))}
                  inputMode="numeric"
                  required
                />
                <FormInput
                  label="Telefone da Oficina *"
                  placeholder="(00) 0000-0000"
                  value={workshopPhone}
                  onChange={(e) => setWorkshopPhone(formatPhone(e.target.value))}
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <FormInput
                  label="Endereço da Oficina *"
                  placeholder="Rua, Número, Bairro, Cidade"
                  value={workshopAddress}
                  onChange={(e) => setWorkshopAddress(e.target.value)}
                  required
                />
              </div>
            </div>
          </FormCard>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6 animate-slide-in">
          <FormCard title="Envolvimento de Terceiros" description="Causou danos a outro veículo ou propriedade?">
            <div className="space-y-6">
              <YesNoToggle
                label="Houve terceiro envolvido no sinistro?"
                value={hasThirdParty}
                onChange={setHasThirdParty}
              />

              {hasThirdParty === "sim" && (
                <div className="space-y-5 animate-slide-in pt-4 border-t border-border mt-4">
                  <div className="bg-muted/50 p-4 rounded-xl flex gap-3 border border-border mb-2">
                    <FileText className="text-foreground/80 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-muted-foreground">
                      <strong>Atenção:</strong> Será necessário nos enviar a foto do documento do veículo do terceiro e os boletins de ocorrência através do nosso WhatsApp ao fim da solicitação.
                    </p>
                  </div>
                  
                  <FormInput
                    label="Nome Completo do Terceiro *"
                    placeholder="Nome de quem estava dirigindo o outro veículo"
                    value={thirdName}
                    onChange={(e) => setThirdName(e.target.value)}
                    required
                  />
                  <FormInput
                    label="CPF *"
                    placeholder="000.000.000-00"
                    value={thirdCpf}
                    onChange={(e) => setThirdCpf(formatCPF(e.target.value))}
                    inputMode="numeric"
                    required
                  />
                  <FormInput
                    label="Data de Nascimento *"
                    placeholder="DD/MM/AAAA"
                    value={thirdBirth}
                    onChange={(e) => setThirdBirth(formatDate(e.target.value))}
                    inputMode="numeric"
                    required
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado Civil *</label>
                    <Select value={thirdMaritalStatus} onValueChange={setThirdMaritalStatus}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="casado">Casado(a) / União Estável</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FormInput
                    label="E-mail *"
                    type="email"
                    placeholder="seu@email.com"
                    value={thirdEmail}
                    onChange={(e) => setThirdEmail(e.target.value)}
                    required
                  />
                  <div className="sm:col-span-2">
                    <FormInput
                      label="Endereço Residencial do Terceiro *"
                      placeholder="Rua, Número, Bairro, Cidade"
                      value={thirdAddress}
                      onChange={(e) => setThirdAddress(e.target.value)}
                      required
                    />
                  </div>
                  <FormInput
                    label="Número da CNH *"
                    placeholder="Somente números"
                    value={thirdCnh}
                    onChange={(e) => setThirdCnh(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    required
                  />
                  <FormInput
                    label="Validade da CNH *"
                    placeholder="DD/MM/AAAA"
                    value={thirdCnhValidity}
                    onChange={(e) => setThirdCnhValidity(formatDate(e.target.value))}
                    inputMode="numeric"
                    required
                  />
                </div>
              )}
            </div>
          </FormCard>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-6 animate-slide-in">
          <FormCard title="Conclusão e Aceite" description="Confirme os dados para prosseguir com a abertura do sinistro">
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Resumo da Solicitação</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Veículo (PLACA):</span>
                    <span className="font-medium text-right">{vehiclePlate}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Condutor:</span>
                    <span className="font-medium text-right">{driverName}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Ocorrência:</span>
                    <span className="font-medium text-right">{eventDate} às {eventTime}</span>
                  </li>
                  <li className="flex justify-between border-t border-border/50 pt-2 mt-2">
                    <span className="text-muted-foreground">Houve Terceiro Envolvido:</span>
                    <span className="font-medium text-right">{hasThirdParty === "sim" ? "Sim" : "Não"}</span>
                  </li>
                </ul>
              </div>

              <LgpdConsent
                acceptedTerms={acceptedTerms}
                acceptedPrivacy={acceptedPrivacy}
                onAcceptTermsChange={setAcceptedTerms}
                onAcceptPrivacyChange={setAcceptedPrivacy}
              />
            </div>
          </FormCard>
        </div>
      )}

      {/* Navegação Inferior */}
      <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0 || isSubmitting} className="w-full sm:w-auto h-12 px-6">
          <ArrowLeft size={18} className="mr-2" />
          Voltar
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button onClick={nextStep} disabled={!isStepValid(currentStep)} className="w-full sm:w-auto h-12 px-8 ml-4">
            Avançar
            <ArrowRight size={18} className="ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!isStepValid(3) || isSubmitting} className="w-full sm:w-auto h-12 px-8 ml-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center justify-center">
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Enviando Aviso...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} className="mr-2" />
                  Abrir Sinistro
                </>
              )}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};
