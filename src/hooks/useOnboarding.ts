
import { useState } from 'react';
import { useProfile, useUpdateProfile } from './useProfile';
import { supabase } from '@/integrations/supabase/client';

export function useOnboarding() {
  const { data: profile, isLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const [isCompleting, setIsCompleting] = useState(false);

  // 🔍 LÓGICA EXPLÍCITA E SEGURA
  const shouldShowOnboarding = !isLoading && 
                                profile !== null && 
                                profile.onboarding_completed === false;

  // 🔍 LOG DE DEBUG PARA DIAGNÓSTICO
  console.log('🔍 ONBOARDING DEBUG:', {
    isLoading,
    profile: profile ? 'exists' : 'null',
    onboarding_completed: profile?.onboarding_completed,
    shouldShowOnboarding
  });

  const completeOnboarding = async () => {
    if (!profile || isCompleting) return;

    setIsCompleting(true);
    try {
      console.log('🎯 Marcando onboarding como concluído...');
      await updateProfileMutation.mutateAsync({
        onboarding_completed: true
      });
      console.log('✅ Onboarding marcado como concluído!');
    } catch (error) {
      console.error('❌ Erro ao marcar onboarding como concluído:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  return {
    shouldShowOnboarding,
    completeOnboarding,
    isCompleting,
    profile
  };
}
