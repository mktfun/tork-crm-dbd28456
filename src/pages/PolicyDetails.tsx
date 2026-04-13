import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, Upload, Calendar, DollarSign, Building2, User, Phone, Mail, MapPin, Edit, Calculator, ArrowRight, Ban, RotateCcw, ExternalLink, CreditCard, Shield, Clock } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AppCard } from '@/components/ui/app-card';
import { usePolicies } from '@/hooks/useAppData';
import { useSupabaseClients } from '@/hooks/useSupabaseClients';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCompanyNames } from '@/hooks/useCompanyNames';
import { useProducerNames } from '@/hooks/useProducerNames';
import { BudgetConversionModal } from '@/components/policies/BudgetConversionModal';
import { RenewPolicyModal } from '@/components/policies/RenewPolicyModal';
import { PolicyFormModal } from '@/components/policies/PolicyFormModal';
import { AutoRenewalIndicator } from '@/components/policies/AutoRenewalIndicator';
import { PolicyRenewalSection } from '@/components/policies/PolicyRenewalSection';
import type { Policy, Client } from '@/types';
import { CommissionExtract } from '@/components/policies/CommissionExtract';
import { useToast } from '@/hooks/use-toast';
import { linkCarteirinhaToPolicy } from '@/services/policyImportService';

export default function PolicyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { policies, updatePolicy, ativarEAnexarPdf, isUpdatingPolicy } = usePolicies();
  const { clients } = useSupabaseClients();
  const { getCompanyName } = useCompanyNames();
  const { getProducerName } = useProducerNames();
  const { toast } = useToast();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isEditPolicyModalOpen, setIsEditPolicyModalOpen] = useState(false);
  const [isUploadingCarteirinha, setIsUploadingCarteirinha] = useState(false);

  const isBudget = policy?.status === 'Orçamento';

  usePageTitle(policy ? `${isBudget ? 'Orçamento' : 'Apólice'} ${policy.policyNumber || `ORÇ-${policy.id.slice(-8)}`}` : 'Detalhes');

  useEffect(() => {
    if (id && policies.length > 0) {
      const foundPolicy = policies.find(p => p.id === id);
      if (foundPolicy) {
        setPolicy(foundPolicy);
        const associatedClient = clients.find(c => c.id === foundPolicy.clientId);
        setClient(associatedClient);
      }
    }
  }, [id, policies, clients]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && policy) {
      if (file.type !== 'application/pdf') {
        toast({ title: 'Erro', description: 'Apenas arquivos PDF são permitidos.', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Erro', description: 'O arquivo deve ter no máximo 10MB.', variant: 'destructive' });
        return;
      }
      try {
        await ativarEAnexarPdf(policy.id, file);
        const isCurrentlyActive = policy.status === 'Ativa';
        toast({
          title: 'Sucesso',
          description: isCurrentlyActive ? 'PDF anexado com sucesso!' : 'PDF anexado e apólice ativada com sucesso!',
        });
      } catch (error) {
        console.error('Erro ao fazer upload do PDF:', error);
        toast({ title: 'Erro', description: 'Erro ao anexar PDF. Tente novamente.', variant: 'destructive' });
      }
    }
  };

  const handleDownloadPdf = () => {
    if (policy?.pdfAnexado) {
      const link = document.createElement('a');
      link.href = policy.pdfAnexado.dados;
      link.download = policy.pdfAnexado.nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCarteirinhaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !policy) return;
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Erro', description: 'Formato inválido. Use PDF, JPG ou PNG.', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'O arquivo deve ter no máximo 10MB.', variant: 'destructive' });
      return;
    }
    try {
      setIsUploadingCarteirinha(true);
      const result = await linkCarteirinhaToPolicy(policy.id, file, policy.userId || '');
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Carteirinha anexada com sucesso!' });
        window.location.reload();
      } else {
        toast({ title: 'Erro', description: result.error || 'Erro ao anexar carteirinha', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao anexar carteirinha', variant: 'destructive' });
    } finally {
      setIsUploadingCarteirinha(false);
    }
  };

  const handleCancelPolicy = async () => {
    if (policy) {
      try {
        await updatePolicy(policy.id, { status: 'Cancelada' });
        toast({ title: 'Sucesso', description: 'Apólice cancelada com sucesso.' });
      } catch (error) {
        console.error('Erro ao cancelar apólice:', error);
        toast({ title: 'Erro', description: 'Erro ao cancelar apólice. Tente novamente.', variant: 'destructive' });
      }
    }
  };

  if (!policy) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/policies')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Registro não encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  const hasPdf = !!(policy.pdfAnexado || policy.pdfUrl);
  const shouldShowUpload = policy.status === 'Aguardando Apólice' || (policy.status === 'Ativa' && !hasPdf);
  const getUploadButtonText = () => {
    if (policy.status === 'Aguardando Apólice') return 'Anexar PDF e Ativar';
    return 'Anexar PDF';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Ativa': 'bg-emerald-600/80 text-foreground hover:bg-emerald-700/80',
      'Orçamento': 'bg-blue-600/80 text-foreground hover:bg-blue-700/80',
      'Cancelada': 'bg-red-600/80 text-foreground hover:bg-red-700/80',
      'Aguardando Apólice': 'bg-amber-600/80 text-foreground hover:bg-amber-700/80',
      'Renovada': 'bg-purple-600/80 text-foreground hover:bg-purple-700/80',
    };
    return (
      <Badge className={styles[status] || 'bg-muted text-foreground'}>
        {status}
      </Badge>
    );
  };

  // Calculate remaining days
  const getDaysRemaining = () => {
    if (!policy.expirationDate) return null;
    const days = Math.ceil((new Date(policy.expirationDate).getTime() - Date.now()) / 86400000);
    const color = days < 0 ? 'text-destructive' : days < 30 ? 'text-amber-500' : 'text-emerald-500';
    const label = days < 0 ? `${Math.abs(days)}d vencida` : `${days}d restantes`;
    return { days, color, label };
  };

  const daysInfo = getDaysRemaining();

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* ═══ HEADER REDESENHADO ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/policies')} className="mt-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            <div>
              {/* Breadcrumb contextual */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <span>{policy.ramos?.nome || policy.type || 'Seguro'}</span>
                <span>·</span>
                <span>{policy.companies?.name || 'Seguradora não definida'}</span>
                {policy.insuredAsset && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[200px]">{policy.insuredAsset}</span>
                  </>
                )}
              </div>

              {/* Nome do cliente - destaque principal */}
              <h1 className="text-2xl font-bold text-foreground">
                {client?.name || 'Sem cliente'}
              </h1>

              {/* Número da apólice */}
              <p className="text-sm text-muted-foreground mt-0.5">
                {isBudget ? 'Orçamento' : 'Apólice'} · {policy.policyNumber || `ORÇ-${policy.id.slice(-8)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {getStatusBadge(policy.status)}
            <AutoRenewalIndicator
              automaticRenewal={policy.automaticRenewal}
              expirationDate={policy.expirationDate}
              status={policy.status}
            />
            {policy.renewalStatus && (
              <Badge variant="outline" className="text-muted-foreground">{policy.renewalStatus}</Badge>
            )}
          </div>
        </div>

        {/* ═══ LAYOUT GRID 3+2 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ═══ COLUNA PRINCIPAL (3/5) ═══ */}
          <div className="lg:col-span-3 space-y-6">
            {/* Card Detalhes da Apólice */}
            <AppCard className="p-0 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 p-5 pb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  {isBudget ? <Calculator className="w-5 h-5 text-primary" /> : <Shield className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {isBudget ? 'Detalhes do Orçamento' : 'Detalhes da Apólice'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Informações do contrato</p>
                </div>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    {isBudget ? 'ID do Orçamento' : 'Número da Apólice'}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{policy.policyNumber || `ORÇ-${policy.id.slice(-8)}`}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Seguradora</p>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">{policy.companies?.name || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ramo</p>
                  <p className="text-sm font-medium text-foreground">{policy.ramos?.nome || policy.type || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                  {getStatusBadge(policy.status)}
                </div>
                {policy.insuredAsset && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bem Segurado</p>
                    <p className="text-sm font-medium text-foreground">{policy.insuredAsset}</p>
                  </div>
                )}
                {policy.producerId && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produtor</p>
                    <p className="text-sm font-medium text-foreground">{getProducerName(policy.producerId)}</p>
                  </div>
                )}
              </div>

              <Separator className="my-4 bg-border" />

              {/* Financial section */}
              <div className="grid grid-cols-2 gap-4 px-5">
                <div className="bg-emerald-500/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Prêmio</p>
                  <p className="text-lg font-bold text-emerald-500">
                    {policy.premiumValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Comissão</p>
                  <p className="text-sm font-semibold text-primary">{policy.commissionRate}%</p>
                  <p className="text-lg font-bold text-primary">
                    {(policy.premiumValue * policy.commissionRate / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Início</p>
                    <p className="text-sm font-medium text-foreground">{policy.startDate ? formatDate(policy.startDate) : '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(policy.expirationDate)}</p>
                  </div>
                </div>
              </div>
            </AppCard>

            {/* Card Cliente */}
            {client && (
              <AppCard>
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Cliente</h3>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {client.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-semibold text-foreground">{client.name}</p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {client.phone && (
                          <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md hover:bg-muted transition-colors">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </a>
                        )}
                        {client.email && (
                          <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md hover:bg-muted transition-colors">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </a>
                        )}
                        {client.address && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                            <MapPin className="w-3 h-3" />
                            {client.address}{client.number ? `, ${client.number}` : ''} · {client.city}/{client.state}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link to={`/clients/${client.id}`}>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Ver
                    </Button>
                  </Link>
                </div>
              </AppCard>
            )}

            {/* Commission Extract - intacto */}
            {!isBudget && policy && <CommissionExtract policy={policy} />}
          </div>

          {/* ═══ SIDEBAR (2/5) ═══ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Ações */}
            <AppCard>
              <h3 className="text-sm font-semibold text-foreground mb-4">Ações</h3>

              <div className="space-y-2">
                {isBudget ? (
                  <BudgetConversionModal
                    budgetId={policy.id}
                    budgetDescription={`${policy.companies?.name || 'Seguradora'} - ${policy.ramos?.nome || 'Ramo'}`}
                    onConversionSuccess={() => window.location.reload()}
                  >
                    <Button className="w-full">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Converter em Apólice
                    </Button>
                  </BudgetConversionModal>
                ) : (
                  <>
                    {/* Grupo principal */}
                    <div className="space-y-2">
                      {policy.status === 'Ativa' && (
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground" onClick={() => setIsRenewModalOpen(true)}>
                          <RotateCcw className="w-4 h-4 mr-2" /> Renovar
                        </Button>
                      )}
                      <Button variant="outline" className="w-full" onClick={() => setIsEditPolicyModalOpen(true)}>
                        <Edit className="w-4 h-4 mr-2" /> Editar Apólice
                      </Button>
                    </div>

                    {/* Documentos */}
                    {(shouldShowUpload || hasPdf || policy.carteirinhaUrl || !policy.carteirinhaUrl) && (
                      <>
                        <Separator className="my-3 bg-border" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Documentos</p>
                        <div className="space-y-2">
                          {shouldShowUpload && (
                            <div>
                              <label htmlFor="pdf-upload">
                                <Button asChild className="w-full" disabled={isUpdatingPolicy}>
                                  <span className="cursor-pointer">
                                    <Upload className="w-4 h-4 mr-2" />
                                    {isUpdatingPolicy ? 'Processando...' : getUploadButtonText()}
                                  </span>
                                </Button>
                              </label>
                              <input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {policy.status === 'Aguardando Apólice' ? 'Anexe para ativar (máx. 10MB)' : 'Máx. 10MB'}
                              </p>
                            </div>
                          )}

                          {(policy.pdfAnexado || policy.pdfUrl) && (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                if (policy.pdfAnexado) handleDownloadPdf();
                                else if (policy.pdfUrl) window.open(policy.pdfUrl, '_blank');
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Ver Apólice
                            </Button>
                          )}

                          {policy.carteirinhaUrl ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => window.open(policy.carteirinhaUrl, '_blank')}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Ver Carteirinha
                            </Button>
                          ) : (
                            <div>
                              <label htmlFor="carteirinha-upload">
                                <Button asChild variant="outline" className="w-full border-dashed border-border" disabled={isUploadingCarteirinha}>
                                  <span className="cursor-pointer">
                                    <Upload className="w-4 h-4 mr-2" />
                                    {isUploadingCarteirinha ? 'Enviando...' : 'Anexar Carteirinha'}
                                  </span>
                                </Button>
                              </label>
                              <input id="carteirinha-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleCarteirinhaUpload} className="hidden" />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Zona de perigo */}
                    {(policy.status === 'Ativa' || policy.status === 'Aguardando Apólice') && (
                      <>
                        <Separator className="my-3 bg-border" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Ban className="w-4 h-4 mr-2" />
                              Cancelar Apólice
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">Cancelar Apólice</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Tem certeza que deseja cancelar esta apólice? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-muted text-foreground">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleCancelPolicy}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Confirmar Cancelamento
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </>
                )}
              </div>
            </AppCard>

            {/* Card Informações — enriquecido */}
            <AppCard>
              <h3 className="text-sm font-semibold text-foreground mb-4">Informações</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Criado em</span>
                  <span className="text-sm text-foreground">
                    {new Date(policy.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {policy.renewalStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status Renovação</span>
                    <Badge variant="outline" className="text-xs">{policy.renewalStatus}</Badge>
                  </div>
                )}

                {policy.pdfAnexado && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">PDF</span>
                    <span className="text-xs text-foreground truncate max-w-[150px]">{policy.pdfAnexado.nome}</span>
                  </div>
                )}

                {daysInfo && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Prazo</span>
                    <span className={`text-sm font-semibold ${daysInfo.color}`}>
                      {daysInfo.label}
                    </span>
                  </div>
                )}
              </div>
            </AppCard>

            {/* Renovação Automática — intacto */}
            <AppCard>
              <h3 className="text-sm font-semibold text-foreground mb-4">Renovação Automática</h3>
              <PolicyRenewalSection
                policyId={policy.id}
                automaticRenewal={policy.automaticRenewal}
                expirationDate={policy.expirationDate}
              />
            </AppCard>
          </div>
        </div>
      </div>

      {/* Modais — intactos */}
      {policy && (
        <>
          <RenewPolicyModal
            policy={policy}
            isOpen={isRenewModalOpen}
            onClose={() => setIsRenewModalOpen(false)}
            onSuccess={() => setIsRenewModalOpen(false)}
          />

          {isEditPolicyModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
              <div className="bg-card border border-border rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Editar Apólice</h2>
                  <Button
                    onClick={() => setIsEditPolicyModalOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </Button>
                </div>
                <PolicyFormModal
                  policy={policy}
                  isEditing={true}
                  onClose={() => setIsEditPolicyModalOpen(false)}
                  onPolicyAdded={() => setIsEditPolicyModalOpen(false)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
