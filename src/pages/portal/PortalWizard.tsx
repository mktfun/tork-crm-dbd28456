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
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <EndorsementWizard />
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
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <h2 className="text-xl font-light text-white tracking-wide">
          {type === 'sinistro' ? 'Avisar Sinistro' : 'Nova Cotação'}
        </h2>
        <p className="text-zinc-500 text-sm">Selecione o tipo de seguro:</p>

        <div className="grid grid-cols-2 gap-3">
          {RAMOS.map((ramo) => {
            const Icon = ramo.icon;
            return (
              <Card
                key={ramo.id}
                className="bg-black/70 border-white/[0.06] backdrop-blur-2xl cursor-pointer hover:bg-zinc-900/50 hover:border-zinc-600/30 transition-colors"
                onClick={() => setSelectedRamo(ramo.id)}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 bg-zinc-800/80 rounded-xl flex items-center justify-center border border-white/[0.06]">
                    <Icon className="w-6 h-6 text-zinc-400" />
                  </div>
                  <span className="text-sm text-white font-light">{ramo.label}</span>
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
        return <AutoWizard />;
      case 'residencial':
        return <ResidentialWizard />;
      case 'vida':
        return <LifeWizard />;
      case 'empresarial':
        return <BusinessWizard />;
      case 'viagem':
        return <TravelWizard />;
      case 'saude':
        return <HealthWizard />;
      case 'smartphone':
        return <SmartphoneWizard />;
      default:
        return <p className="text-zinc-400">Wizard não encontrado.</p>;
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSelectedRamo(null)}
        className="text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Trocar ramo
      </Button>
      {renderWizard()}
    </div>
  );
}
