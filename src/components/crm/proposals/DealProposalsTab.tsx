import React, { useState } from 'react';
import { useProposalByDeal, useCreateProposal } from '@/hooks/useProposals';
import { ProposalPDFImporter } from './ProposalPDFImporter';
import { ProposalSettingsForm } from './ProposalSettingsForm';
import { ProposalAnalyticsDashboard } from './ProposalAnalyticsDashboard';
import { ProposalOption, Proposal } from '@/types';
import { Button } from '@/components/ui/button';
import { Copy, MessageCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface DealProposalsTabProps {
  dealId?: string | null;
  pipelineId?: string | null;
  clientName?: string;
  clientPhone?: string;
}

export function DealProposalsTab({ dealId, pipelineId, clientName, clientPhone }: DealProposalsTabProps) {
  const { data: proposal, isLoading, refetch } = useProposalByDeal(dealId || null);
  const createProposal = useCreateProposal();

  // Creation State
  const [step, setStep] = useState<1 | 2>(1);
  const [extractedOptions, setExtractedOptions] = useState<Partial<ProposalOption>[]>([]);
  const [extractedClientName, setExtractedClientName] = useState<string>('');

  const handleImportComplete = (options: Partial<ProposalOption>[], name?: string) => {
    setExtractedOptions(options);
    if (name) setExtractedClientName(name);
    setStep(2);
  };

  const handleCreateProposal = async (settings: Partial<Proposal>) => {
    if (!dealId) {
      toast.error('Deal ID ausente. Não é possível criar proposta.');
      return;
    }

    // Generate unique token
    const token = crypto.randomUUID().split('-')[0] + crypto.randomUUID().split('-')[1];

    await createProposal.mutateAsync({
      deal_id: dealId,
      title: settings.title!,
      client_name: extractedClientName || clientName,
      client_phone: clientPhone,
      token,
      options: extractedOptions,
      // Pass other settings if needed, for now useCreateProposal handles basic creation
      // A more robust implementation would pass accepted_stage_id, etc.
    });
  };

  const buildWhatsAppLink = () => {
    if (!proposal) return;
    const url = `${window.location.origin}/proposta/${proposal.token}`;
    const text = `Olá${clientName ? ` ${clientName}` : ''}! Aqui está sua proposta de seguro auto interativa. Você pode visualizar e escolher a melhor opção diretamente neste link: ${url}`;
    const wppLink = `https://wa.me/${clientPhone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(text)}`;
    window.open(wppLink, '_blank');
  };

  const copyLink = () => {
    if (!proposal) return;
    const url = `${window.location.origin}/proposta/${proposal.token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const openPreview = () => {
    if (!proposal) return;
    window.open(`/proposta/${proposal.token}`, '_blank');
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando propostas...</div>;
  }

  // If Proposal exists, show Dashboard
  if (proposal) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card border border-border rounded-xl">
          <div>
            <h3 className="font-semibold text-lg">{proposal.title}</h3>
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium capitalize">{proposal.status}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={copyLink}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar Link
            </Button>
            <Button variant="outline" onClick={openPreview}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
            <Button onClick={buildWhatsAppLink} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar WhatsApp
            </Button>
          </div>
        </div>

        <ProposalAnalyticsDashboard proposal={proposal} />
      </div>
    );
  }

  // No deal ID context (e.g., opened from somewhere that doesn't have a deal yet)
  // Actually, we made dealId optional. But our UI here assumes dealId exists for creating.
  // If we want to allow creating without deal, we could adapt `handleCreateProposal`.
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Creation Wizard */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
      </div>

      {step === 1 && (
        <ProposalPDFImporter onImportComplete={handleImportComplete} />
      )}

      {step === 2 && (
        <ProposalSettingsForm 
          dealId={dealId || null}
          pipelineId={pipelineId}
          clientName={extractedClientName || clientName}
          initialOptions={extractedOptions}
          onSave={handleCreateProposal}
        />
      )}
    </div>
  );
}
