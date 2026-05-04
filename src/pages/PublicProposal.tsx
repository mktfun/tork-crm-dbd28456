import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicProposal, useAcceptProposal } from '@/hooks/useProposals';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, FileText, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function PublicProposal() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, isError, refetch } = usePublicProposal(token || null);
  const acceptProposal = useAcceptProposal();
  const [hasLoggedView, setHasLoggedView] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  
  // Telemetria básica
  useEffect(() => {
    if (data?.proposal && token && !hasLoggedView) {
      // Registrar view_started
      supabase.rpc('record_proposal_event', {
        p_token: token,
        p_event_type: 'view_started',
        p_metadata: { userAgent: navigator.userAgent }
      }).then(() => setHasLoggedView(true));

      // Registrar view_ended no unmount (best effort)
      const handleUnload = () => {
        navigator.sendBeacon(
          `${supabase.supabaseUrl}/rest/v1/rpc/record_proposal_event`,
          JSON.stringify({ p_token: token, p_event_type: 'view_ended', p_metadata: {} })
        );
      };
      
      window.addEventListener('beforeunload', handleUnload);
      return () => {
        window.removeEventListener('beforeunload', handleUnload);
      };
    }
  }, [data, token, hasLoggedView]);

  const handleOptionClick = (optionId: string) => {
    if (data?.proposal.status !== 'draft' && data?.proposal.status !== 'sent') return;
    
    setSelectedOptionId(optionId);
    supabase.rpc('record_proposal_event', {
      p_token: token,
      p_event_type: 'option_selected',
      p_metadata: { option_id: optionId }
    });
  };

  const handleAccept = async (optionId: string) => {
    if (!token) return;
    await acceptProposal.mutateAsync({ token, optionId });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data || !data.proposal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Proposta não encontrada</h1>
        <p className="text-muted-foreground">O link pode ter expirado ou estar incorreto.</p>
      </div>
    );
  }

  const { proposal, options } = data;
  const isAccepted = proposal.status === 'accepted';
  const isExpired = proposal.status === 'expired';

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-emerald-200 shadow-xl shadow-emerald-500/10">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl text-emerald-700">Proposta Aceita!</CardTitle>
            <CardDescription className="text-base mt-2">
              Agradecemos a confiança. O seu corretor já foi notificado e dará andamento à emissão da apólice.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-20 selection:bg-primary/20">
      {/* Header Mobile First */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Proposta Oficial</p>
            <h1 className="text-base font-bold truncate">{proposal.title}</h1>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto p-4 mt-4 space-y-6">
        {/* Intro */}
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold tracking-tight">
            Olá{proposal.client_name ? `, ${proposal.client_name.split(' ')[0]}` : ''}!
          </h2>
          <p className="text-muted-foreground text-sm">
            Separamos as melhores opções de seguro para o seu perfil. Analise com calma e escolha a que melhor lhe atende.
          </p>
        </div>

        {/* Opções */}
        <div className="space-y-4">
          {options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            
            return (
              <Card 
                key={opt.id} 
                className={`relative overflow-hidden transition-all duration-300 cursor-pointer border-2 ${
                  isSelected ? 'border-primary shadow-md ring-4 ring-primary/10' : 'border-border/50 hover:border-border'
                }`}
                onClick={() => handleOptionClick(opt.id)}
              >
                {opt.is_recommended && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 z-10 shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    RECOMENDADO
                  </div>
                )}
                
                <CardHeader className="pb-3 relative z-0 bg-gradient-to-b from-zinc-50/50 to-transparent">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-lg leading-tight">{opt.insurer_name}</CardTitle>
                      <CardDescription className="font-medium text-foreground/80 mt-1">{opt.plan_name}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight">
                      {opt.price_annual ? opt.price_annual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sob consulta'}
                    </span>
                    {opt.price_annual && <span className="text-xs text-muted-foreground font-medium uppercase">/ano</span>}
                  </div>

                  {opt.price_monthly && (
                    <div className="text-sm bg-muted/50 p-2 rounded-lg border border-border/50 inline-block font-medium">
                      ou 10x de {opt.price_monthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}

                  {opt.deductible && (
                    <div className="pt-2 border-t border-border/50 text-sm">
                      <span className="text-muted-foreground font-medium">Franquia:</span>{' '}
                      <span className="font-semibold">{opt.deductible}</span>
                    </div>
                  )}

                  {opt.coverage_items && opt.coverage_items.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Principais Coberturas</p>
                      <ul className="grid gap-2">
                        {opt.coverage_items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-tight text-foreground/90">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>

                {isSelected && !isExpired && (
                  <CardFooter className="bg-primary/5 pt-4 pb-4 border-t border-primary/10 animate-in slide-in-from-top-2">
                    <Button 
                      className="w-full text-base font-bold shadow-sm shadow-primary/20" 
                      size="lg"
                      disabled={acceptProposal.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept(opt.id);
                      }}
                    >
                      {acceptProposal.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Aceitar Esta Opção'}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>

        {isExpired && (
          <div className="p-4 bg-muted text-center rounded-xl border border-border text-sm text-muted-foreground mt-8">
            Esta proposta perdeu a validade. Entre em contato com seu corretor para uma atualização.
          </div>
        )}
        
        <div className="text-center mt-12 pb-8 opacity-60">
          <p className="text-[10px] uppercase tracking-widest font-semibold flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Processado por Tork CRM
          </p>
        </div>
      </main>
    </div>
  );
}
