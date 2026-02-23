import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Shield, FileText, CreditCard, Calendar, AlertCircle, Loader2, Plus, FileEdit, AlertTriangle, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

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

  return (
    <div className="space-y-5">
      {/* Welcome Row */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-foreground font-medium text-lg tracking-tight">
            Olá, {clientName.split(' ')[0]} 👋
          </h2>
          <p className="text-muted-foreground text-sm">O que você precisa hoje?</p>
        </div>
      </div>

      {/* BENTO GRID — Nova Solicitação */}
      <div className="grid grid-cols-2 gap-3">
        {/* Nova Cotação — col-span-2 */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/${slug}/portal/wizard?type=cotacao`)}
          className="col-span-2 bg-card/80 border border-border backdrop-blur-xl rounded-2xl p-5 flex items-center justify-between text-left hover:border-primary/20 transition-all duration-200"
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Solicitar</p>
            <p className="text-foreground font-semibold text-lg mt-0.5">Nova Cotação</p>
            <p className="text-muted-foreground text-sm mt-1">Auto, Vida, Residencial e mais</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-4">
            <Plus className="w-6 h-6 text-primary" />
          </div>
        </motion.button>

        {/* Endosso */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(`/${slug}/portal/wizard?type=endosso`)}
          className="bg-card/80 border border-border backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between text-left hover:border-primary/20 transition-all duration-200 min-h-[120px]"
        >
          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
            <FileEdit className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <p className="text-foreground font-medium text-sm">Endosso</p>
            <p className="text-muted-foreground text-xs mt-0.5">Alteração na apólice</p>
          </div>
        </motion.button>

        {/* Sinistro */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(`/${slug}/portal/wizard?type=sinistro`)}
          className="bg-card/80 border border-border backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between text-left hover:border-primary/20 transition-all duration-200 min-h-[120px]"
        >
          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <p className="text-foreground font-medium text-sm">Sinistro</p>
            <p className="text-muted-foreground text-xs mt-0.5">Reportar ocorrência</p>
          </div>
        </motion.button>
      </div>

      {/* Quick Access Row */}
      {(portalConfig.show_policies || portalConfig.show_cards) && (
        <div className="grid grid-cols-3 gap-2">
          {portalConfig.show_policies && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/${slug}/portal/policies`)}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-muted/40 hover:bg-muted/70 transition-all duration-200"
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-foreground font-medium">Seguros</span>
            </motion.button>
          )}
          {portalConfig.show_cards && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/${slug}/portal/cards`)}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-muted/40 hover:bg-muted/70 transition-all duration-200"
            >
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-foreground font-medium">Carteiras</span>
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(`/${slug}/portal/solicitacoes`)}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-muted/40 hover:bg-muted/70 transition-all duration-200"
          >
            <Inbox className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-foreground font-medium">Inbox</span>
          </motion.button>
        </div>
      )}

      {/* Seguros Ativos — flat section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <Shield className="w-5 h-5 text-muted-foreground" />
          Seguros Ativos
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhum seguro ativo encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {policies.slice(0, 3).map((policy) => (
              <div
                key={policy.id}
                className="flex justify-between items-center p-3 bg-muted/30 rounded-xl border border-border/40 transition-all duration-200 hover:bg-accent/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {policy.insured_asset || 'Apólice'}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
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
              <button
                onClick={() => navigate(`/${slug}/portal/policies`)}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                Ver todos ({policies.length}) →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Help — flat */}
      <div className="flex items-start gap-3 py-3">
        <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-foreground text-sm font-medium">Precisa de ajuda?</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Entre em contato com sua corretora para dúvidas sobre apólices ou sinistros.
          </p>
        </div>
      </div>
    </div>
  );
}
