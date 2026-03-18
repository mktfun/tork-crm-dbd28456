import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Header } from "@/modules/jjseguros/components/Header";
import { Footer } from "@/modules/jjseguros/components/Footer";
import { Car, Home, Heart, Building2, Plane, HeartPulse, Shield, Smartphone, RefreshCw, PlusCircle, FileEdit, KeyRound, AlertTriangle } from "lucide-react";
import { AutoWizard, ResidentialWizard, LifeWizard, BusinessWizard, TravelWizard, HealthWizard, EndorsementWizard, SmartphoneWizard, FiancaWizard, SinistroWizard } from "@/modules/jjseguros/components/wizards";
import { FormCard } from "@/modules/jjseguros/components/ui/form-card";

type InsuranceType = "auto" | "residencial" | "vida" | "empresarial" | "viagem" | "saude" | "uber" | "smartphone" | "fianca" | "sinistro";
type DealType = "renovacao" | "novo" | "endosso" | null;

const insuranceConfig: Record<InsuranceType, {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  component: React.ComponentType<{ dealType?: DealType; isUber?: boolean }>;
  requiresDealType: boolean;
}> = {
  auto: {
    title: "Seguro Auto",
    icon: Car,
    iconColor: "text-primary",
    component: AutoWizard,
    requiresDealType: true
  },
  uber: {
    title: "Seguro Uber/Similares",
    icon: Smartphone,
    iconColor: "text-primary",
    component: AutoWizard,
    requiresDealType: true
  },
  residencial: {
    title: "Seguro Residencial",
    icon: Home,
    iconColor: "text-primary",
    component: ResidentialWizard,
    requiresDealType: false
  },
  vida: {
    title: "Seguro de Vida",
    icon: Heart,
    iconColor: "text-primary",
    component: LifeWizard,
    requiresDealType: false
  },
  empresarial: {
    title: "Seguro Empresarial",
    icon: Building2,
    iconColor: "text-primary",
    component: BusinessWizard,
    requiresDealType: false
  },
  viagem: {
    title: "Seguro Viagem",
    icon: Plane,
    iconColor: "text-primary",
    component: TravelWizard,
    requiresDealType: false
  },
  saude: {
    title: "Plano de Saúde",
    icon: HeartPulse,
    iconColor: "text-primary",
    component: HealthWizard,
    requiresDealType: false
  },
  smartphone: {
    title: "Seguro Smartphone",
    icon: Smartphone,
    iconColor: "text-primary",
    component: SmartphoneWizard as React.ComponentType<{ dealType?: DealType; isUber?: boolean }>,
    requiresDealType: false
  },
  fianca: {
    title: "Fiança Residencial",
    icon: KeyRound,
    iconColor: "text-primary",
    component: FiancaWizard as React.ComponentType<{ dealType?: DealType; isUber?: boolean }>,
    requiresDealType: false
  },
  sinistro: {
    title: "Aviso de Sinistro",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    component: SinistroWizard as React.ComponentType<{ dealType?: DealType; isUber?: boolean }>,
    requiresDealType: false
  }
};

const validTypes: InsuranceType[] = ["auto", "uber", "residencial", "vida", "empresarial", "viagem", "saude", "smartphone", "fianca", "sinistro"];

// Componente de seleção de Deal Type
interface DealTypeSelectorProps {
  onSelect: (type: DealType) => void;
  insuranceType: InsuranceType;
}

const DealTypeSelector: React.FC<DealTypeSelectorProps> = ({ onSelect, insuranceType }) => {
  const config = insuranceConfig[insuranceType];
  const Icon = config.icon;

  return (
    <FormCard 
      title="Qual o tipo de solicitação?" 
      description="Selecione uma opção para continuar"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 mb-6 pb-4 border-b border-border">
          <Icon className={config.iconColor} size={28} />
          <span className="font-semibold text-foreground">{config.title}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {/* Renovação JJ Seguros */}
          <button
            type="button"
            onClick={() => onSelect("renovacao")}
            className="group relative flex flex-col items-center justify-center p-5 sm:p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 gap-3 min-h-[160px] h-auto border-border bg-background text-muted-foreground hover:bg-[#f8f9fa] hover:border-primary hover:text-primary"
          >
            <div className="p-3 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
              <RefreshCw size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <span className="font-bold text-base block mb-1">Renovação JJ Seguros</span>
              <span className="text-xs text-muted-foreground leading-tight">Já sou cliente da corretora</span>
            </div>
          </button>

          {/* Seguro Novo */}
          <button
            type="button"
            onClick={() => onSelect("novo")}
            className="group relative flex flex-col items-center justify-center p-5 sm:p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 gap-3 min-h-[160px] h-auto border-border bg-background text-muted-foreground hover:bg-[#f8f9fa] hover:border-primary hover:text-primary"
          >
            <div className="p-3 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
              <PlusCircle size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <span className="font-bold text-base block mb-1">Seguro Novo</span>
              <span className="text-xs text-muted-foreground leading-tight">Primeira vez ou outra corretora</span>
            </div>
          </button>

          {/* Solicitação de Endosso */}
          <button
            type="button"
            onClick={() => onSelect("endosso")}
            className="group relative flex flex-col items-center justify-center p-5 sm:p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 gap-3 min-h-[160px] h-auto border-border bg-background text-muted-foreground hover:bg-[#f8f9fa] hover:border-primary hover:text-primary"
          >
            <div className="p-3 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
              <FileEdit size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <span className="font-bold text-base block mb-1">Solicitação de Endosso</span>
              <span className="text-xs text-muted-foreground leading-tight">Alterações na apólice vigente</span>
            </div>
          </button>
        </div>
      </div>
    </FormCard>
  );
};

const Cotacao = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const typeParam = searchParams.get("type") as InsuranceType | null;
  const dealParam = searchParams.get("deal") as DealType | null;
  const insuranceType: InsuranceType = typeParam && validTypes.includes(typeParam) ? typeParam : "auto";
  
  const config = insuranceConfig[insuranceType];
  
  // Inicializa dealType baseado no parâmetro da URL (se válido)
  const [dealType, setDealType] = useState<DealType>(() => {
    if (config.requiresDealType && dealParam && ['renovacao', 'novo', 'endosso'].includes(dealParam)) {
      return dealParam as DealType;
    }
    return null;
  });
  
  const Icon = config.icon;
  const WizardComponent = config.component;
  
  // Determina se precisa mostrar o seletor de deal type
  const showDealTypeSelector = config.requiresDealType && dealType === null;

  // Gerar título dinâmico baseado no dealType
  const getPageTitle = () => {
    if (dealType === 'renovacao') {
      return `QAR - Renovação ${config.title}`;
    } else if (dealType === 'novo') {
      return `QAR - ${config.title} Novo`;
    } else if (dealType === 'endosso') {
      return `Endosso - ${config.title}`;
    }
    return `Cotação de ${config.title}`;
  };

  // Redirect to hub if no type specified
  useEffect(() => {
    if (!typeParam) {
      navigate("/seguros", { replace: true });
    }
  }, [typeParam, navigate]);

  // Reset dealType when insurance type changes (only if no deal param in URL)
  useEffect(() => {
    const dealFromUrl = searchParams.get("deal") as DealType | null;
    if (config.requiresDealType && dealFromUrl && ['renovacao', 'novo', 'endosso'].includes(dealFromUrl)) {
      setDealType(dealFromUrl as DealType);
    } else if (!dealFromUrl) {
      setDealType(null);
    }
  }, [insuranceType, searchParams, config.requiresDealType]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-28 sm:pt-32 pb-12 bg-[#fafafa]">
        <div className="container">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground mb-4">
              <Shield size={16} />
              <span>Cotação Rápida e Segura</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 flex items-center justify-center gap-3">
              <Icon className="text-primary" size={36} />
              {getPageTitle()}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {showDealTypeSelector 
                ? "Primeiro, nos conte: é uma renovação ou seguro novo?"
                : "Preencha o formulário abaixo e receba as melhores ofertas de seguro para você."
              }
            </p>
          </div>

          {/* Deal Type Selector OR Wizard */}
          <div className="w-full max-w-2xl mx-auto">
            {showDealTypeSelector ? (
              <DealTypeSelector 
                onSelect={setDealType} 
                insuranceType={insuranceType}
              />
            ) : dealType === "endosso" ? (
              <EndorsementWizard isUber={insuranceType === "uber"} />
            ) : (
              <WizardComponent 
                dealType={dealType} 
                isUber={insuranceType === "uber"}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cotacao;
