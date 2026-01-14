import { supabase } from '@/integrations/supabase/client';
import { PolicyFilters } from '@/hooks/useFilteredPolicies';
import { startOfMonth, endOfMonth, addDays, startOfToday } from 'date-fns';

interface User {
  id: string;
}

export async function exportPoliciesCSV(filters: PolicyFilters, user: User) {
  console.log('📥 Starting CSV export with filters:', filters);

  // Construir query com os mesmos filtros (sem paginação)
  let query = supabase
    .from('apolices')
    .select(`
      id,
      policy_number,
      status,
      premium_value,
      commission_rate,
      expiration_date,
      start_date,
      insured_asset,
      type,
      companies:insurance_company (name),
      ramos:ramo_id (nome),
      clientes:client_id (name, cpf_cnpj, phone)
    `)
    .eq('user_id', user.id);

  // Aplicar filtro por Status
  if (filters.status && filters.status !== 'todos') {
    query = query.eq('status', filters.status);
  }

  // Aplicar filtro por Seguradora
  if (filters.insuranceCompany && filters.insuranceCompany !== 'todas') {
    query = query.eq('insurance_company', filters.insuranceCompany);
  }

  // Aplicar filtro por Ramo
  if (filters.ramo && filters.ramo !== 'todos') {
    query = query.eq('type', filters.ramo);
  }

  // Aplicar filtro por Produtor
  if (filters.producerId && filters.producerId !== 'todos') {
    query = query.eq('producer_id', filters.producerId);
  }

  // Aplicar filtro por Termo de Busca
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const searchTerm = filters.searchTerm.trim();
    query = query.or(`policy_number.ilike.%${searchTerm}%,insured_asset.ilike.%${searchTerm}%`);
  }

  // Aplicar filtro por Período de Vencimento
  if (filters.period && filters.period !== 'todos') {
    const hoje = startOfToday();

    if (filters.period === 'custom' && filters.customStart && filters.customEnd) {
      query = query
        .gte('expiration_date', filters.customStart)
        .lte('expiration_date', filters.customEnd);
    } else {
      switch (filters.period) {
        case 'current-month':
          const inicioMes = startOfMonth(hoje);
          const fimMes = endOfMonth(hoje);
          query = query
            .gte('expiration_date', inicioMes.toISOString())
            .lte('expiration_date', fimMes.toISOString());
          break;
        case 'next-30-days':
          const prox30 = addDays(hoje, 30);
          query = query
            .gte('expiration_date', hoje.toISOString())
            .lte('expiration_date', prox30.toISOString());
          break;
        case 'next-90-days':
          const prox90 = addDays(hoje, 90);
          query = query
            .gte('expiration_date', hoje.toISOString())
            .lte('expiration_date', prox90.toISOString());
          break;
        case 'expired':
          query = query.lt('expiration_date', hoje.toISOString());
          break;
      }
    }
  }

  // Ordenação
  query = query.order('created_at', { ascending: false });

  // Executar query (SEM .range() - buscar tudo!)
  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching policies for export:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Nenhuma apólice encontrada com os filtros aplicados.');
  }

  console.log(`✅ Fetched ${data.length} policies for export`);

  // Criar headers do CSV
  const headers = [
    'Número da Apólice',
    'Cliente',
    'CPF/CNPJ',
    'Telefone',
    'Seguradora',
    'Ramo',
    'Status',
    'Prêmio (R$)',
    'Comissão (%)',
    'Data Início',
    'Data Vencimento',
    'Bem Segurado'
  ];

  // Mapear dados para linhas do CSV
  const rows = data.map(policy => [
    policy.policy_number || '-',
    policy.clientes?.name || '-',
    policy.clientes?.cpf_cnpj || '-',
    policy.clientes?.phone || '-',
    policy.companies?.name || '-',
    policy.ramos?.nome || policy.type || '-',
    policy.status,
    Number(policy.premium_value || 0).toFixed(2).replace('.', ','),
    Number(policy.commission_rate || 0).toFixed(2).replace('.', ','),
    policy.start_date || '-',
    policy.expiration_date || '-',
    policy.insured_asset || '-'
  ]);

  // Gerar string CSV (usando ponto e vírgula para Excel BR)
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
  ].join('\n');

  // Criar Blob com UTF-8 BOM (para acentuação correta no Excel)
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  // Gerar nome do arquivo com data atual
  const today = new Date();
  const fileName = `relatorio_apolices_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.csv`;

  // Criar link temporário e forçar download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`✅ CSV exported successfully: ${fileName}`);
}
