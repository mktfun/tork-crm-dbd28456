import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProposalByDeal, useCreateProposal } from '@/hooks/useProposals';
import { usePolicies } from '@/hooks/useAppData';
import { ProposalAnalyticsDashboard } from '@/components/crm/proposals/ProposalAnalyticsDashboard';
import { ProposalPDFImporter } from '@/components/crm/proposals/ProposalPDFImporter';
import { BudgetConversionModal } from '@/components/policies/BudgetConversionModal';
import type { Policy, Client, ProposalOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  MessageCircle,
  Sparkles,
  User,
  Phone,
  Mail,
  ArrowRight,
  CalendarDays,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface BudgetDetailsViewProps {
  policy: Policy;
  client: Client | null;
}

export function BudgetDetailsView({ policy, client }: BudgetDetailsViewProps) {
  const navigate = useNavigate();
  const { data: proposal, isLoading, refetch } = useProposalByDeal(policy.id);
  const createProposal = useCreateProposal();
  const { deletePolicy } = usePolicies();
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [showPDFImporter, setShowPDFImporter] = useState(false);
  const [extractedOptions, setExtractedOptions] = useState<Partial<ProposalOption>[]>([]);

  const handleDelete = async () => {
    try {
      await deletePolicy(policy.id);
      toast.success('Orçamento excluído com sucesso');
      navigate('/dashboard/policies');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir orçamento');
    }
  };

  const buildWhatsAppLink = () => {
    if (!proposal) return;
    const url = `${window.location.origin}/proposta/${proposal.token}`;
    const name = client?.name?.split(' ')[0] || '';
    const text = `Olá${name ? ` ${name}` : ''}! Preparei um orçamento interativo para você. Acesse o link e escolha a melhor opção 👇\n\n${url}`;
    const phone = client?.phone?.replace(/\D/g, '') || '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyLink = () => {
    if (!proposal) return;
    const url = `${window.location.origin}/proposta/${proposal.token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const openPreview = () => {
    if (!proposal) return;
    window.open(`/proposta/${proposal.token}`, '_blank');
  };

  const handleImportComplete = (options: Partial<ProposalOption>[]) => {
    setExtractedOptions(options);
  };

  const handleGenerateInteractiveProposal = async () => {
    setIsCreatingProposal(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await createProposal.mutateAsync({
        deal_id: policy.id,
        title: `Proposta Auto — ${client?.name || 'Cliente'}`,
        client_name: client?.name,
        client_phone: client?.phone,
        token,
        options: extractedOptions,
      });
      refetch();
      setShowPDFImporter(false);
    } catch (e) {
      console.error('Erro ao gerar proposta:', e);
    } finally {
      setIsCreatingProposal(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/policies')} className="mt-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <span>Orçamento</span>
              <span>·</span>
              <span className="font-mono">ORÇ-{policy.id.slice(-8).toUpperCase()}</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {client?.name || 'Sem cliente'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {policy.ramos?.nome || policy.type || 'Seguro Auto'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-sm px-3 py-1">
            🔵 Em Orçamento
          </Badge>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Orçamento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este orçamento permanentemente? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* ─── LAYOUT GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── COLUNA PRINCIPAL ─── */}
        <div className="lg:col-span-3 space-y-6">
          {isLoading ? (
            <div className="animate-pulse bg-muted rounded-2xl h-40" />
          ) : proposal ? (
            <>
              {/* Link da Proposta */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    Link da Proposta Interativa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-4 py-3">
                    <code className="text-xs text-foreground flex-1 truncate">
                      {window.location.origin}/proposta/{proposal.token}
                    </code>
                    <Button variant="ghost" size="sm" onClick={copyLink} className="shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={copyLink} className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button variant="outline" onClick={openPreview} className="flex-1">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button
                      onClick={buildWhatsAppLink}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics Dashboard */}
              <ProposalAnalyticsDashboard proposal={proposal} />
            </>
          ) : (
            /* Sem proposta ainda */
            <Card className="border-dashed border-2 border-border">
              <CardContent className="pt-10 pb-10 text-center space-y-4">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Criar Proposta Interativa</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Importe o PDF de cotação e gere um link personalizado para o cliente escolher o plano.
                  </p>
                </div>

                {!showPDFImporter ? (
                  <Button onClick={() => setShowPDFImporter(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Proposta Interativa
                  </Button>
                ) : (
                  <div className="text-left mt-4 space-y-4">
                    <ProposalPDFImporter onImportComplete={handleImportComplete} />
                    {extractedOptions.length > 0 && (
                      <Button onClick={handleGenerateInteractiveProposal} disabled={isCreatingProposal} className="w-full">
                        {isCreatingProposal ? 'Gerando...' : 'Confirmar e Gerar Link'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── SIDEBAR ─── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card Cliente */}
          {client && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {client.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{client.name}</p>
                    {client.cpfCnpj && (
                      <p className="text-xs text-muted-foreground">{client.cpfCnpj}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                      {client.phone}
                    </a>
                  )}
                  {client.email && (
                    <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{client.email}</span>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span className="text-foreground">{new Date(policy.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validade</span>
                <span className="text-foreground">{new Date(policy.expirationDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status Proposta</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {proposal?.status || 'Sem proposta'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Ação: Converter em Apólice */}
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="pt-5 pb-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">Cliente aceitou?</p>
              <p className="text-xs text-muted-foreground">Converta este orçamento em uma apólice ativa.</p>
              <BudgetConversionModal
                budgetId={policy.id}
                budgetDescription={`${policy.companies?.name || 'Seguradora'} - ${policy.ramos?.nome || 'Ramo'}`}
                onConversionSuccess={() => navigate('/dashboard/policies')}
              >
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Converter em Apólice
                </Button>
              </BudgetConversionModal>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
