import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Car, Home, Heart, Briefcase, Plane, Activity, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { usePortalWizardSubmit, type RequestType } from '@/hooks/usePortalWizardSubmit';
import {
  AutoWizard,
  ResidentialWizard,
  LifeWizard,
  BusinessWizard,
  TravelWizard,
  HealthWizard,
  SmartphoneWizard,
  EndorsementWizard,
} from '@/components/portal/wizards';

const RAMOS = [
  { id: 'auto', label: 'Auto', icon: Car },
  { id: 'residencial', label: 'Residencial', icon: Home },
  { id: 'vida', label: 'Vida', icon: Heart },
  { id: 'empresarial', label: 'Empresarial', icon: Briefcase },
  { id: 'viagem', label: 'Viagem', icon: Plane },
  { id: 'saude', label: 'Saúde', icon: Activity },
  { id: 'smartphone', label: 'Smartphone', icon: Smartphone },
];

export default function PortalWizard() {
  const navigate = useNavigate();
  const { brokerageSlug } = useParams<{ brokerageSlug: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') as RequestType | null;
  const ramoParam = searchParams.get('ramo');
  const [selectedRamo, setSelectedRamo] = useState<string | null>(ramoParam);
  const { submitToPortal } = usePortalWizardSubmit();

  const handleComplete = async (payload: any) => {
    const requestType = type || 'cotacao';
    const qarReport = payload?.customFields?.cf_qar_auto
      || payload?.customFields?.cf_qar_residencial
      || payload?.customFields?.cf_qar_vida
      || payload?.customFields?.cf_qar_empresarial
      || payload?.customFields?.cf_qar_viagem
      || payload?.customFields?.cf_qar_saude
      || payload?.customFields?.cf_qar_respondido
      || JSON.stringify(payload?.customFields || {});

    const success = await submitToPortal(
      payload,
      requestType,
      qarReport,
      payload?.is_qualified ?? true,
      payload?.disqualification_reason
    );

    if (success) {
      navigate(`/${brokerageSlug}/portal/solicitacoes`, { replace: true });
    }
  };

  // If type is "endosso", render endorsement wizard directly
  if (type === 'endosso') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/${brokerageSlug}/portal/home`)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <EndorsementWizard onComplete={handleComplete} />
      </div>
    );
  }

  // If no ramo selected, show selection screen
  if (!selectedRamo) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/${brokerageSlug}/portal/home`)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <h2 className="text-xl font-light text-foreground tracking-wide">
          {type === 'sinistro' ? 'Avisar Sinistro' : 'Nova Cotação'}
        </h2>
        <p className="text-muted-foreground text-sm">Selecione o tipo de seguro:</p>

        <div className="grid grid-cols-2 gap-3">
          {RAMOS.map((ramo) => {
            const Icon = ramo.icon;
            return (
              <Card
                key={ramo.id}
                className="bg-card/80 border-border backdrop-blur-xl cursor-pointer hover:bg-accent hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                onClick={() => setSelectedRamo(ramo.id)}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center border border-border">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-foreground font-light">{ramo.label}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Render the selected wizard
  const renderWizard = () => {
    switch (selectedRamo) {
      case 'auto':
        return <AutoWizard onComplete={handleComplete} />;
      case 'residencial':
        return <ResidentialWizard onComplete={handleComplete} />;
      case 'vida':
        return <LifeWizard onComplete={handleComplete} />;
      case 'empresarial':
        return <BusinessWizard onComplete={handleComplete} />;
      case 'viagem':
        return <TravelWizard onComplete={handleComplete} />;
      case 'saude':
        return <HealthWizard onComplete={handleComplete} />;
      case 'smartphone':
        return <SmartphoneWizard onComplete={handleComplete} />;
      default:
        return <p className="text-muted-foreground">Wizard não encontrado.</p>;
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSelectedRamo(null)}
        className="text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Trocar ramo
      </Button>
      {renderWizard()}
    </div>
  );
}
