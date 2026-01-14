
import { useSupabaseProducers } from './useSupabaseProducers';

export function useProducerNames() {
  const { producers } = useSupabaseProducers();

  const getProducerName = (producerId: string | null): string => {
    if (!producerId) return 'Produtor não especificado';
    
    const producer = producers.find(p => p.id === producerId);
    return producer?.name || 'Produtor não encontrado';
  };

  return {
    getProducerName,
    producers
  };
}
