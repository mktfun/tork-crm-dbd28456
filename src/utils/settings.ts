import { supabase } from '@/integrations/supabase/client';
import type { LocationEntry } from './qualification';

export interface IntegrationSettings {
  id: number;
  mode: 'rd_station' | 'webhook';
  webhook_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Marketing & Conversão
  meta_pixel_id: string | null;
  meta_capi_token: string | null;
  // SDR Qualification - Health
  health_age_limit_min: number;
  health_age_limit_max: number;
  health_lives_min: number;
  health_lives_max: number;
  health_accept_cpf: boolean;
  health_accept_cnpj: boolean;
  health_cnpj_min_employees: number;
  health_cpf_require_higher_education: boolean;
  health_region_mode: 'allow_all' | 'allow_list' | 'block_list';
  health_region_states: string[]; // Legado
  health_region_locations: LocationEntry[]; // Novo: estado+cidade
  health_budget_min: number;
}

export async function getSettings(): Promise<IntegrationSettings | null> {
  const { data, error } = await supabase
    .from('integration_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Erro ao buscar settings:', error);
    return null;
  }

  // Converter tipos JSON para tipos TypeScript corretos
  const rawLocations = (data as any).health_region_locations;
  const locations: LocationEntry[] = Array.isArray(rawLocations) ? rawLocations : [];

  return {
    ...data,
    health_region_locations: locations,
  } as IntegrationSettings;
}

export async function saveSettings(
  settings: Partial<Pick<IntegrationSettings, 
    'mode' | 'webhook_url' | 'is_active' | 'meta_pixel_id' | 'meta_capi_token' |
    'health_age_limit_min' | 'health_age_limit_max' | 'health_lives_min' | 'health_lives_max' |
    'health_accept_cpf' | 'health_accept_cnpj' | 'health_cnpj_min_employees' |
    'health_cpf_require_higher_education' | 'health_region_mode' | 'health_region_states' |
    'health_region_locations' | 'health_budget_min'
  >>
): Promise<boolean> {
  // Preparar dados para envio - converter LocationEntry[] para JSON
  const updateData: Record<string, unknown> = {
    ...settings,
    updated_at: new Date().toISOString(),
  };
  
  // health_region_locations é um array de objetos - converter explicitamente
  if (settings.health_region_locations) {
    updateData.health_region_locations = JSON.parse(
      JSON.stringify(settings.health_region_locations)
    );
  }

  const { error } = await supabase
    .from('integration_settings')
    .update(updateData as any)
    .eq('id', 1);

  if (error) {
    console.error('Erro ao salvar settings:', error);
    return false;
  }

  return true;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
