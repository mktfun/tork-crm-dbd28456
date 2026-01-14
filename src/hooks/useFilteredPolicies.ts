import { useMemo, useState } from 'react';
import { usePolicies, useClients } from '@/hooks/useAppData';
import { useSupabaseProducers } from '@/hooks/useSupabaseProducers';
import { Policy } from '@/types';
import { startOfMonth, endOfMonth, addDays, isWithinInterval, startOfToday } from 'date-fns';

export interface PolicyFilters {
  searchTerm: string;
  status: string;
  insuranceCompany: string; // stores company ID or 'todas'
  period: string; // 'todos' | presets | 'custom'
  producerId: string;
  ramo: string;
  customStart: string | null;
  customEnd: string | null;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export function useFilteredPolicies() {
  const { policies, loading } = usePolicies();
  const { clients } = useClients();
  const { producers } = useSupabaseProducers();
  
  // Estado para todos os nossos filtros
  const [filters, setFilters] = useState<PolicyFilters>({
    searchTerm: '',
    status: 'todos',
    insuranceCompany: 'todas',
    period: 'todos',
    producerId: 'todos',
    ramo: 'todos',
    customStart: null,
    customEnd: null,
  });

  // Estado para ordenação - padrão por data de vencimento
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'expirationDate',
    direction: 'asc'
  });

  // Obter seguradoras únicas
  const uniqueInsuranceCompanies = useMemo(() => {
    const companies = policies.map(p => p.insuranceCompany);
    return [...new Set(companies)].filter(Boolean);
  }, [policies]);

  const filteredPolicies = useMemo(() => {
    console.log('🔍 Iniciando filtros com:', filters);
    console.log('📋 Total de apólices:', policies.length);
    
    const hoje = startOfToday();

    // Primeiro aplicar filtros
    const filtered = policies.filter(policy => {
      // Filtro por termo de busca (no número da apólice ou nome do cliente)
      if (filters.searchTerm) {
        const client = clients.find(c => c.id === policy.clientId);
        const clientName = client?.name?.toLowerCase() || '';
        const policyNumber = policy.policyNumber?.toLowerCase() || '';
        const searchTerm = filters.searchTerm.toLowerCase();
        
        if (!policyNumber.includes(searchTerm) && !clientName.includes(searchTerm)) {
          return false;
        }
      }
      
      // Filtro por Status
      if (filters.status !== 'todos' && policy.status !== filters.status) {
        return false;
      }

      // Filtro por Seguradora
      if (filters.insuranceCompany !== 'todas' && policy.insuranceCompany !== filters.insuranceCompany) {
        return false;
      }

      // Filtro por Ramo
      if (filters.ramo !== 'todos' && policy.type !== filters.ramo) {
        return false;
      }

      // Filtro por Produtor
      if (filters.producerId !== 'todos' && policy.producerId !== filters.producerId) {
        return false;
      }

      // Filtro por Período de Vencimento
      if (filters.period !== 'todos') {
        const dataVencimento = new Date(policy.expirationDate);

        if (filters.period === 'custom' && filters.customStart && filters.customEnd) {
          const start = new Date(filters.customStart);
          const end = new Date(filters.customEnd);
          if (!isWithinInterval(dataVencimento, { start, end })) return false;
        } else {
          switch (filters.period) {
            case 'current-month':
              const inicioMes = startOfMonth(hoje);
              const fimMes = endOfMonth(hoje);
              if (!isWithinInterval(dataVencimento, { start: inicioMes, end: fimMes })) return false;
              break;
            case 'next-30-days':
              const prox30 = addDays(hoje, 30);
              if (!isWithinInterval(dataVencimento, { start: hoje, end: prox30 })) return false;
              break;
            case 'next-90-days':
              const prox90 = addDays(hoje, 90);
              if (!isWithinInterval(dataVencimento, { start: hoje, end: prox90 })) return false;
              break;
            case 'expired':
              if (dataVencimento >= hoje) return false;
              break;
          }
        }
      }

      return true; // Se passou por todos os filtros, a apólice é incluída
    });

    // Depois aplicar ordenação
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'clientName':
          const clientA = clients.find(c => c.id === a.clientId);
          const clientB = clients.find(c => c.id === b.clientId);
          aValue = clientA?.name || '';
          bValue = clientB?.name || '';
          break;
        case 'insuranceCompany':
          aValue = a.insuranceCompany || '';
          bValue = b.insuranceCompany || '';
          break;
        case 'producerName':
          const producerA = producers.find(p => p.id === a.producerId);
          const producerB = producers.find(p => p.id === b.producerId);
          aValue = producerA?.name || '';
          bValue = producerB?.name || '';
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        case 'premiumValue':
          aValue = a.premiumValue;
          bValue = b.premiumValue;
          break;
        case 'expirationDate':
          aValue = new Date(a.expirationDate);
          bValue = new Date(b.expirationDate);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      // Tratamento para diferentes tipos de dados
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    console.log('✅ Apólices filtradas e ordenadas:', sorted.length);
    return sorted;
  }, [policies, clients, producers, filters, sortConfig]);

  // Função para alterar ordenação
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Função helper para resetar filtros
  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      status: 'todos',
      insuranceCompany: 'todas',
      period: 'todos',
      producerId: 'todos',
      ramo: 'todos',
      customStart: null,
      customEnd: null,
    });
  };

  return { 
    filters, 
    setFilters, 
    filteredPolicies, 
    uniqueInsuranceCompanies,
    producers,
    resetFilters,
    totalPolicies: policies.length,
    isLoading: loading,
    sortConfig,
    handleSort
  };
}
