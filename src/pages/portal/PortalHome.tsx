import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Shield, FileText, CreditCard, Calendar, AlertCircle, Loader2, Plus, FileEdit, AlertTriangle, Inbox, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };

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
    <div className="space-y-6">
      {/* Horizontal Action Pills */}
      <div>
        <p className="text-muted-foreground text-sm mb-3">O que você precisa solicitar?</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={springTransition}
            onClick={() => navigate(`/${slug}/portal/wizard?type=cotacao`)}
            className="bg-foreground text-background rounded-full px-5 py-2.5 text-[0.9rem] font-medium shadow-sm flex-shrink-0"
          >
            Nova Cotação
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={springTransition}
            onClick={() => navigate(`/${slug}/portal/wizard?type=endosso`)}
            className="bg-card text-foreground rounded-full px-5 py-2.5 text-[0.9rem] font-medium shadow-sm flex-shrink-0 hover:bg-muted/50 transition-colors"
          >
            Endosso
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={springTransition}
            onClick={() => navigate(`/${slug}/portal/wizard?type=sinistro`)}
            className="bg-card text-foreground rounded-full px-5 py-2.5 text-[0.9rem] font-medium shadow-sm flex-shrink-0 hover:bg-muted/50 transition-colors"
          >
            Sinistro
          </motion.button>
        </div>
      </div>

      {/* Hero Card — TripGlide style */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={springTransition}
        onClick={() => navigate(`/${slug}/portal/wizard?type=cotacao`)}
        className="relative w-full rounded-3xl overflow-hidden shadow-md text-left"
        style={{ height: '280px' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 to-foreground" />
        <div className="relative h-full flex flex-col justify-between p-6">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <p className="text-background/60 text-sm font-medium tracking-wide uppercase">Cobertura Completa</p>
              <h3 className="text-background text-2xl font-bold mt-1 tracking-tight">Proteger seu Bem</h3>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3"
            >
              <Shield className="w-10 h-10 text-background/20" />
            </motion.div>
          </div>
          <div className="flex items-center justify-between bg-background/15 backdrop-blur-md rounded-full px-4 py-3">
            <span className="text-background text-sm font-medium">Fazer cotação agora</span>
            <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-background" />
            </div>
          </div>
        </div>
      </motion.button>

      {/* Seguros Ativos — Neobank list style */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-foreground font-semibold text-base">Apólices Ativas</h3>
          <button
            onClick={() => navigate(`/${slug}/portal/policies`)}
            className="text-foreground text-sm font-medium underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-foreground transition-colors"
          >
            Ver todas
          </button>
        </div>

        {isLoading ? (
          <div className="bg-card rounded-3xl shadow-sm p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : policies.length === 0 ? (
          <div className="bg-card rounded-3xl shadow-sm p-8 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhum seguro ativo encontrado.</p>
          </div>
        ) : (
          <div className="bg-card rounded-3xl shadow-sm overflow-hidden">
            {policies.slice(0, 3).map((policy, idx) => (
              <motion.button
                whileTap={{ scale: 0.98 }}
                transition={springTransition}
                key={policy.id}
                onClick={() => navigate(`/${slug}/portal/policies`)}
                className={cn(
                  'flex justify-between items-center p-5 text-left w-full transition-colors hover:bg-muted/30',
                  idx !== Math.min(policies.length, 3) - 1 && 'border-b border-muted/50'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {policy.insured_asset || 'Apólice sem nome'}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Vence: {format(new Date(policy.expiration_date), 'dd MMM yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getExpirationBadge(policy.expiration_date)}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </div>
              </motion.button>
            ))}
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
