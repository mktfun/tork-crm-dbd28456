
import { useSupabaseRenewalMetrics } from './useSupabaseRenewalMetrics';

// Legacy hook for backward compatibility
// New code should use useSupabaseRenewalMetrics directly
export function useRenewalMetrics() {
  return useSupabaseRenewalMetrics();
}
