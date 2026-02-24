import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Car, Home, Heart, Briefcase, Plane, Activity, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
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

        <div className="grid grid-cols-2 gap-3 mt-2">
          {RAMOS.map((ramo, idx) => {
            const Icon = ramo.icon;
            return (
              <motion.button
                key={ramo.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedRamo(ramo.id)}
                className="bg-card rounded-3xl shadow-sm p-5 flex flex-col items-center justify-center text-center gap-3 border border-transparent hover:border-muted-foreground/10 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <span className="text-foreground text-sm font-medium">
                  {ramo.label}
                </span>
              </motion.button>
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
