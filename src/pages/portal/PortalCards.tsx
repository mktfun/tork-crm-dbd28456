import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, AlertCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { VirtualCard } from '@/components/portal/VirtualCard';
import { getCompanyAssistance } from '@/utils/insuranceAssistance';
import { usePortalPermissions } from '@/hooks/usePortalPermissions';

interface Policy {
  id: string;
  insured_asset: string | null;
  expiration_date: string;
  start_date: string | null;
  policy_number: string | null;
  insurance_company: string | null;
  type: string | null;
  status: string;
  carteirinha_url: string | null;
}

interface Company {
  id: string;
  name: string;
  assistance_phone: string | null;
}

interface ClientData {
  id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  user_id: string;
}

export default function PortalCards() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [companies, setCompanies] = useState<Record<string, Company>>({});
  const [clientData, setClientData] = useState<{ name: string; cpf_cnpj: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hook centralizado de permissões
  const { canDownloadCards, isLoading: permissionsLoading } = usePortalPermissions();

  useEffect(() => {
    const storedClient = sessionStorage.getItem('portal_client');
    if (storedClient) {
      const client: ClientData = JSON.parse(storedClient);
      setClientData({
        name: client.name || '',
        cpf_cnpj: client.cpf_cnpj || null,
      });
      fetchCardsHybrid(client);
    }
  }, []);

  const fetchCardsHybrid = async (client: ClientData) => {
    try {
      const { data: policiesData, error: policiesError } = await supabase
        .rpc('get_portal_cards_hybrid' as any, {
          p_user_id: client.user_id,
          p_client_id: client.id,
          p_cpf: client.cpf_cnpj || null,
          p_email: client.email || null
        });

      if (policiesError) {
        console.error('Error fetching cards hybrid:', policiesError);
        return;
      }

      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, assistance_phone')
        .eq('user_id', client.user_id);

      const companiesMap: Record<string, Company> = {};
      companiesData?.forEach((c: Company) => {
        companiesMap[c.id] = c;
      });

      setCompanies(companiesMap);
      setPolicies((policiesData as Policy[]) || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getAssistancePhone = (policy: Policy): string | null => {
    if (!policy.insurance_company) return null;
    
    const company = companies[policy.insurance_company];
    if (!company) return null;

    return getCompanyAssistance(company.name, company.assistance_phone);
  };

  if (isLoading || permissionsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-zinc-800" />
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-72 w-full bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-light text-white tracking-wide">Minhas Carteirinhas</h2>
        {!canDownloadCards && (
          <Badge variant="outline" className="border-zinc-700 text-zinc-400 gap-1">
            <Eye className="w-3 h-3" />
            Visualização apenas
          </Badge>
        )}
      </div>

      {policies.length === 0 ? (
        <Card className="bg-black/70 border-white/[0.06] backdrop-blur-2xl">
          <CardContent className="p-8 text-center">
            <CreditCard className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 font-light">Nenhuma carteirinha disponível.</p>
            <p className="text-zinc-600 text-sm mt-1">
              Suas carteirinhas aparecerão aqui quando houver seguros ativos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {policies.map((policy) => {
            const company = policy.insurance_company ? companies[policy.insurance_company] : null;
            
            return (
              <VirtualCard
                key={policy.id}
                policy={policy}
                clientName={clientData?.name || ''}
                clientCpf={clientData?.cpf_cnpj || null}
                companyName={company?.name || null}
                assistancePhone={getAssistancePhone(policy)}
                canDownload={canDownloadCards}
              />
            );
          })}
        </div>
      )}

      <Card className="bg-black/70 border-white/[0.06] backdrop-blur-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/[0.06]">
              <AlertCircle className="w-4 h-4 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-500 font-light">
              Apresente esta carteirinha digital em caso de sinistro ou quando solicitado.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
