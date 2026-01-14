import { Link } from 'react-router-dom';
import { AppCard } from '@/components/ui/app-card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatCurrency';
import { TrendingUp, FileText } from 'lucide-react';

interface PreviewCardProps {
  title: string;
  data: any[] | undefined;
  linkTo: string;
  filters: { seguradoraId?: string | null; ramo?: string | null };
  extraParams?: Record<string, string | number | undefined>;
}

export default function PreviewCard({ title, data, linkTo, filters, extraParams }: PreviewCardProps) {
  if (!data || data.length === 0) return null;

  const list = data.slice(0, 5);
  const totalCount = (data[0] && (data[0].total_records || data[0].total || data.length)) || 0;
  const remainingCount = totalCount > 5 ? totalCount - 5 : 0;

  const params = new URLSearchParams();
  if (filters.seguradoraId) params.set('seguradora', String(filters.seguradoraId));
  if (filters.ramo) params.set('ramo', String(filters.ramo));
  if (extraParams) {
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length > 0) params.set(k, String(v));
    });
  }
  const qs = params.toString();
  const destinationUrl = qs ? `${linkTo}?${qs}` : linkTo;

  return (
    <AppCard className="bg-slate-900/60 border border-slate-800 rounded-xl">
      <div className="px-2 pb-2">
        <div className="text-white font-semibold mb-3">{title} ({totalCount})</div>
        <div className="space-y-3">
          {list.map((item: any) => {
            const isPolicy = Boolean(item.policy_number || item.policyNumber);
            const isClientWithStats = Boolean(item.total_policies !== undefined);
            const titleText = isPolicy ? (item.policy_number || item.policyNumber) : (item.nome || item.name || 'Sem nome');
            const subtitle = isPolicy ? (item.client_name || '') : (item.email || '');
            const insurer = (item.insurance_company_name || item.insurance_company) ? String(item.insurance_company_name || item.insurance_company) : undefined;
            const ramo = item.type || item.ramo || undefined;
            const phone = !isPolicy ? (item.phone || item.telefone || undefined) : undefined;
            const detailUrl = isPolicy ? `/dashboard/policies/${item.id}` : `/dashboard/clients/${item.id}`;
            
            return (
              <Link
                to={detailUrl}
                key={item.id}
                className="flex flex-col rounded-md p-2 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <span className="text-slate-200 text-sm font-medium truncate">{titleText}</span>
                {subtitle && <span className="text-slate-400 text-xs truncate">{subtitle}</span>}
                
                {/* Mostrar estatísticas para clientes com dados agregados */}
                {isClientWithStats && (
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-400">
                        <FileText size={10} />
                        <span>Apólices</span>
                      </div>
                      <span className="text-slate-300">{item.total_policies}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Prêmio</span>
                      <span className="text-slate-300">{formatCurrency(item.total_premium)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-emerald-400">
                        <TrendingUp size={10} />
                        <span>Comissão</span>
                      </div>
                      <span className="text-emerald-400 font-medium">{formatCurrency(item.total_commission)}</span>
                    </div>
                  </div>
                )}
                
                {/* Layout original para apólices e clientes sem estatísticas */}
                {!isClientWithStats && (
                  <>
                    {(insurer || ramo) && (
                      <span className="text-slate-500 text-[11px] truncate">
                        {[insurer, ramo].filter(Boolean).join(' • ')}
                      </span>
                    )}
                    {phone && (
                      <span className="text-slate-500 text-[11px] truncate">{phone}</span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
          {remainingCount > 0 && (
            <p className="mt-1 text-sm text-slate-400">+ {remainingCount} mais...</p>
          )}
          <Button asChild className="mt-2 w-full">
            <Link to={destinationUrl}>Ver Todos</Link>
          </Button>
        </div>
      </div>
    </AppCard>
  );
}
