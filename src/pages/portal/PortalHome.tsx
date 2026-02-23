import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, FileText, CreditCard, Calendar, AlertCircle, Loader2, Plus, FileEdit, AlertTriangle, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Policy {
  id: string;
  insured_asset: string | null;
  expiration_date: string;
  status: string;
  premium_value: number;
  insurance_company: string | null;
}

interface PortalConfig {
  show_policies: boolean;
  show_cards: boolean;
  allow_profile_edit: boolean;
}

interface ClientData {
  id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  user_id: string;
}

export default function PortalHome() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [slug, setSlug] = useState('');
  const [portalConfig, setPortalConfig] = useState<PortalConfig>({
    show_policies: true,
    show_cards: true,
    allow_profile_edit: true,
  });

  useEffect(() => {
    const clientData = sessionStorage.getItem('portal_client');
    const storedSlug = sessionStorage.getItem('portal_brokerage_slug');

    if (clientData && storedSlug) {
      const client: ClientData = JSON.parse(clientData);
      setClientName(client.name || '');
      setSlug(storedSlug);
      fetchPoliciesHybrid(client);
      fetchPortalConfig(client.user_id);
    }
  }, []);

  // BUSCA HÍBRIDA: client_id + CPF + email (resolve problema de clientes sem CPF)
  const fetchPoliciesHybrid = async (client: ClientData) => {
    try {
      const { data, error } = await supabase
        .rpc('get_portal_policies_hybrid' as any, {
          p_user_id: client.user_id,
          p_client_id: client.id,
          p_cpf: client.cpf_cnpj || null,
          p_email: client.email || null
        });

      if (error) {
        console.error('Error fetching policies hybrid:', error);
        return;
      }

      setPolicies((data as Policy[]) || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPortalConfig = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('brokerages')
        .select('portal_show_policies, portal_show_cards, portal_allow_profile_edit')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (data) {
        setPortalConfig({
          show_policies: data.portal_show_policies ?? true,
          show_cards: data.portal_show_cards ?? true,
          allow_profile_edit: data.portal_allow_profile_edit ?? true,
        });
      }
    } catch (err) {
      console.error('Error fetching portal config:', err);
    }
  };

  const getExpirationBadge = (expirationDate: string) => {
    const days = differenceInDays(new Date(expirationDate), new Date());

    if (days < 0) {
      return <Badge className="bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20">Vencida</Badge>;
    } else if (days <= 30) {
      return <Badge className="bg-muted text-muted-foreground border-border">Vence em {days} dias</Badge>;
    } else {
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Vigente</Badge>;
    }
  };

  const hasQuickActions = portalConfig.show_policies || portalConfig.show_cards;

  return (
    <div className="space-y-4">
      {/* Welcome Card */}
      <Card className="bg-primary/5 border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center shadow-sm border border-border">
              <Shield className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-foreground font-light text-lg tracking-wide">Bem-vindo(a)!</h2>
              <p className="text-muted-foreground text-sm">{clientName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nova Solicitação */}
      <Card className="bg-card/80 border-border backdrop-blur-xl">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-foreground font-light tracking-wide flex items-center gap-2">
            <Plus className="w-4 h-4 text-muted-foreground" />
            Nova Solicitação
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5 bg-card/60 border-border hover:bg-accent hover:border-primary/30 transition-all duration-200 active:scale-[0.98]"
              onClick={() => navigate(`/${slug}/portal/wizard?type=cotacao`)}
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-foreground font-light">Nova Cotação</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5 bg-card/60 border-border hover:bg-accent hover:border-primary/30 transition-all duration-200 active:scale-[0.98]"
              onClick={() => navigate(`/${slug}/portal/wizard?type=endosso`)}
            >
              <FileEdit className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-foreground font-light">Endosso</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5 bg-card/60 border-border hover:bg-accent hover:border-primary/30 transition-all duration-200 active:scale-[0.98]"
              onClick={() => navigate(`/${slug}/portal/wizard?type=sinistro`)}
            >
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-foreground font-light">Sinistro</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {hasQuickActions && (
        <div className="grid grid-cols-2 gap-3">
          {portalConfig.show_policies && (
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 bg-card/80 border-border hover:bg-accent hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
              onClick={() => navigate(`/${slug}/portal/policies`)}
            >
              <FileText className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-foreground font-light">Meus Seguros</span>
            </Button>
          )}
          {portalConfig.show_cards && (
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 bg-card/80 border-border hover:bg-accent hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
              onClick={() => navigate(`/${slug}/portal/cards`)}
            >
              <CreditCard className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-foreground font-light">Carteirinhas</span>
            </Button>
          )}
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 bg-card/80 border-border hover:bg-accent hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
            onClick={() => navigate(`/${slug}/portal/solicitacoes`)}
          >
            <Inbox className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-foreground font-light">Pedidos</span>
          </Button>
        </div>
      )}

      {/* Active Policies */}
      <Card className="bg-card/80 border-border backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-foreground font-light flex items-center gap-2 tracking-wide">
            <Shield className="w-5 h-5 text-muted-foreground" />
            Seguros Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground font-light">Nenhum seguro ativo encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {policies.slice(0, 3).map((policy) => (
                <div
                  key={policy.id}
                  className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border transition-all duration-200 hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-light text-foreground truncate">
                      {policy.insured_asset || 'Apólice'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Vence: {format(new Date(policy.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  {getExpirationBadge(policy.expiration_date)}
                </div>
              ))}

              {policies.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => navigate(`/${slug}/portal/policies`)}
                >
                  Ver todos ({policies.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="bg-card/80 border-border backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 border border-border">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-light text-foreground">Precisa de ajuda?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Entre em contato com sua corretora para dúvidas sobre suas apólices ou sinistros.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
