import { useEffect, useState } from 'react';
import { supabase } from '@/modules/jjseguros/integrations/supabase/client';
import { initMetaPixel } from '@/modules/jjseguros/utils/metaPixel';

/**
 * Hook para inicializar o Meta Pixel a partir das configurações do banco
 * Deve ser usado no componente raiz (App.tsx)
 */
export function useMetaPixelInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pixelId, setPixelId] = useState<string | null>(null);

  useEffect(() => {
    const loadPixelConfig = async () => {
      try {
        const { data: settings } = await supabase
          .from('integration_settings')
          .select('meta_pixel_id')
          .eq('id', 1)
          .single();

        if (settings?.meta_pixel_id) {
          initMetaPixel(settings.meta_pixel_id);
          setPixelId(settings.meta_pixel_id);
          setIsInitialized(true);
        }
      } catch (error) {
        console.warn('Erro ao carregar configuração do Meta Pixel:', error);
      }
    };

    loadPixelConfig();
  }, []);

  return { isInitialized, pixelId };
}
