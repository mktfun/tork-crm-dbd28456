
import { useSupabaseCompanies } from './useSupabaseCompanies';

export function useCompanyNames() {
  const { companies, loading } = useSupabaseCompanies();

  const getCompanyName = (companyId: string | null): string => {
    if (!companyId) return 'Seguradora não especificada';
    
    const company = companies.find(c => c.id === companyId);
    return company?.name || companyId; // Fallback para o ID se não encontrar
  };

  const getCompanyNames = (companyIds: string[]): Record<string, string> => {
    const names: Record<string, string> = {};
    companyIds.forEach(id => {
      names[id] = getCompanyName(id);
    });
    return names;
  };

  return {
    getCompanyName,
    getCompanyNames,
    companies,
    loading
  };
}
