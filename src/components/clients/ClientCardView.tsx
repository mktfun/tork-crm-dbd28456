
import { Client } from '@/types';
import { ClientCard } from './ClientCard';

interface ClientWithStats {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf_cnpj?: string;
  total_policies: number;
  total_premium: number;
  total_commission: number;
  active_policies: number;
  budget_policies: number;
}

interface ClientCardViewProps {
  clients: Client[] | ClientWithStats[];
  getActivePoliciesCount?: (clientId: string) => number;
  useStatsData?: boolean;
}

function transformClientToStats(client: Client, activePoliciesCount?: number): ClientWithStats {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    cpf_cnpj: client.cpfCnpj,
    total_policies: activePoliciesCount || 0,
    total_premium: 0,
    total_commission: 0,
    active_policies: activePoliciesCount || 0,
    budget_policies: 0,
  };
}

export function ClientCardView({ clients, getActivePoliciesCount, useStatsData = false }: ClientCardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map(client => (
        <ClientCard
          key={client.id}
          client={useStatsData ? (client as ClientWithStats) : transformClientToStats(client as Client, getActivePoliciesCount?.(client.id))}
        />
      ))}
    </div>
  );
}
