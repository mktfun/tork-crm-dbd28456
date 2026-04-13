import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Car, Home, Heart, Briefcase, Plane, Activity, Smartphone, Loader2, FileText, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { usePortalWizardSubmit, type RequestType } from '@/hooks/usePortalWizardSubmit';
import { supabase } from '@/integrations/supabase/client';
import {
  AutoWizard,
  ResidentialWizard,
  LifeWizard,
  BusinessWizard,
  TravelWizard,
  HealthWizard,
  SmartphoneWizard,
  EndorsementWizard,
  GenericRequestWizard,
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

  // Policy Selection State
  const [policies, setPolicies] = useState<any[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);
  const [showGenericWizard, setShowGenericWizard] = useState(false);

  useEffect(() => {
    if (type === 'endosso' || type === 'sinistro') {
      const fetchPolicies = async () => {
        setIsLoadingPolicies(true);
        try {
          const rawClient = sessionStorage.getItem('portal_client');
          if (!rawClient) {
            setIsLoadingPolicies(false);
            return;
          }
          const client = JSON.parse(rawClient);

          const { data, error } = await supabase
            .rpc('get_portal_policies_hybrid' as any, {
              p_user_id: client.user_id,
              p_client_id: client.id,
              p_cpf: client.cpf_cnpj || null,
              p_email: client.email || null
            });

          if (!error && data) {
            // Filtrar apenas ativas, se desejar (aqui mostramos todas por garantia, pois podem querer endosso de renovacao etc)
            setPolicies(data as any[]);
          }
        } catch (err) {
          console.error('Error fetching policies for wizard:', err);
        } finally {
          setIsLoadingPolicies(false);
        }
      };

      fetchPolicies();
    }
  }, [type]);

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

  const renderPolicySelector = () => {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/${brokerageSlug}/portal/home`)}
          className="text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <h2 className="text-xl font-light text-foreground tracking-wide">
          {type === 'sinistro' ? 'Avisar Sinistro' : 'Solicitar Endosso'}
        </h2>
        <p className="text-muted-foreground text-sm">Selecione a apólice referente à solicitação:</p>

        {isLoadingPolicies ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 mt-4">
            {policies.map((policy, idx) => (
              <motion.button
                key={policy.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedPolicy(policy);
                  setShowGenericWizard(true);
                }}
                className="bg-card rounded-2xl shadow-sm p-4 flex items-center justify-between border border-transparent hover:border-muted-foreground/10 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">
                      {policy.product || policy.insurance_company || 'Apólice'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {policy.insured_asset || policy.policy_number || 'Dados Indisponíveis'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}

            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: policies.length * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedPolicy(null);
                setShowGenericWizard(true);
              }}
              className="mt-2 bg-transparent border-2 border-dashed border-muted-foreground/20 rounded-2xl p-4 flex items-center justify-center text-center hover:border-muted-foreground/40 hover:bg-muted/30 transition-all"
            >
              <span className="text-muted-foreground text-sm font-medium">
                Outros / Não encontrei minha apólice
              </span>
            </motion.button>
          </div>
        )}
      </div>
    );
  };

  if ((type === 'endosso' || type === 'sinistro') && !showGenericWizard) {
    return renderPolicySelector();
  }

  if ((type === 'endosso' || type === 'sinistro') && showGenericWizard) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowGenericWizard(false)}
          className="text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar às Apólices
        </Button>
        <GenericRequestWizard
          type={type}
          policyData={selectedPolicy}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  // If no ramo selected (for cotacao or renovacao)
  if (!selectedRamo && type !== 'endosso' && type !== 'sinistro') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/${brokerageSlug}/portal/home`)}
          className="text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <h2 className="text-xl font-light text-foreground tracking-wide">
          Nova Cotação
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

  // Render the selected wizard (for cotacao or renovacao)
  const renderWizard = () => {
    const dealType = type === 'renovacao' ? 'renovacao' : 'novo';

    switch (selectedRamo) {
      case 'auto':
        return <AutoWizard onComplete={handleComplete} dealType={dealType} />;
      case 'residencial':
        return <ResidentialWizard onComplete={handleComplete} dealType={dealType} />;
      case 'vida':
        return <LifeWizard onComplete={handleComplete} dealType={dealType} />;
      case 'empresarial':
        return <BusinessWizard onComplete={handleComplete} dealType={dealType} />;
      case 'viagem':
        return <TravelWizard onComplete={handleComplete} dealType={dealType} />;
      case 'saude':
        return <HealthWizard onComplete={handleComplete} dealType={dealType} />;
      case 'smartphone':
        return <SmartphoneWizard onComplete={handleComplete} dealType={dealType} />;
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
        className="text-muted-foreground hover:text-foreground -ml-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Trocar ramo
      </Button>
      {renderWizard()}
    </div>
  );
}
