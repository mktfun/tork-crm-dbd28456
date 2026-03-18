import { useCallback, useRef } from 'react';
import { supabase } from '@/modules/jjseguros/integrations/supabase/client';

export interface PartialLeadData {
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  cnpj?: string;
  personType?: string;
  insuranceType: string;
  stepIndex: number;
}

export const usePartialLead = () => {
  const leadIdRef = useRef<string | null>(null);

  const savePartialLead = useCallback(async (data: PartialLeadData): Promise<string | null> => {
    try {
      console.log('💾 Salvando lead parcial:', data.email, 'Step:', data.stepIndex);

      // Upsert baseado no email - atualiza se já existe ou insere se não
      const { data: result, error } = await supabase
        .from('leads')
        .upsert(
          {
            email: data.email,
            name: data.name,
            phone: data.phone,
            cpf: data.cpf || null,
            cnpj: data.cnpj || null,
            person_type: data.personType || null,
            insurance_type: data.insuranceType,
            last_step_index: data.stepIndex,
            is_completed: false,
            qar_report: null,
            custom_fields: {},
            rd_station_synced: false,
          },
          { 
            onConflict: 'email',
            ignoreDuplicates: false 
          }
        )
        .select('id')
        .single();

      if (error) {
        console.error('❌ Erro ao salvar lead parcial:', error);
        return null;
      }

      const id = result?.id ?? null;
      if (id) {
        leadIdRef.current = id;
        console.log('✅ Lead parcial salvo com ID:', id);
      }
      
      return id;
    } catch (error) {
      console.error('💥 Erro crítico ao salvar lead parcial:', error);
      return null;
    }
  }, []);

  const updateStepIndex = useCallback(async (stepIndex: number): Promise<void> => {
    const leadId = leadIdRef.current;
    if (!leadId) {
      console.log('⚠️ Sem lead ID para atualizar step index');
      return;
    }

    try {
      console.log('📊 Atualizando step index para:', stepIndex);
      
      const { error } = await supabase
        .from('leads')
        .update({ last_step_index: stepIndex })
        .eq('id', leadId);

      if (error) {
        console.error('❌ Erro ao atualizar step index:', error);
      }
    } catch (error) {
      console.error('💥 Erro ao atualizar step index:', error);
    }
  }, []);

  const getLeadId = useCallback(() => leadIdRef.current, []);

  return {
    savePartialLead,
    updateStepIndex,
    getLeadId,
  };
};
