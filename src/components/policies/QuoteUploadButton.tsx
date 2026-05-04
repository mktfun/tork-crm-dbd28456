import React, { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parsePDFLocalFallback } from '@/lib/pdfProposalParser';

interface QuoteUploadButtonProps {
  onDataExtracted: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function QuoteUploadButton({ 
  onDataExtracted, 
  onError, 
  disabled = false 
}: QuoteUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      const errorMsg = 'Por favor, selecione um arquivo PDF';
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const errorMsg = 'O arquivo deve ter no máximo 10MB';
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsUploading(true);
    setUploadProgress('Enviando PDF...');

    try {
      // 1. Upload do PDF para o Storage
      const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${safeName}`;
      console.log('🚀 [DEBUG UPLOAD] file.name original:', file.name);
      console.log('🚀 [DEBUG UPLOAD] safeName gerado:', safeName);
      console.log('🚀 [DEBUG UPLOAD] fileName final para envio:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('quote-uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // 2. Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('quote-uploads')
        .getPublicUrl(uploadData.path);

      setUploadProgress('Extraindo dados com IA...');

      // 3. Chamar Edge Function Mistral (a mesma usada no bulk import)
      let finalData = null;
      let usedFallback = false;

      try {
        // Converte o arquivo para base64 para o Mistral
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { data: functionData, error: functionError } = await supabase.functions
          .invoke('analyze-policy-mistral', {
            body: { 
              base64: base64Data,
              fileName: file.name,
              mimeType: file.type,
              mode: 'proposal'
            }
          });

        if (functionError) throw new Error(`Erro na extração Mistral: ${functionError.message}`);
        if (!functionData?.success || !functionData?.data) throw new Error(functionData?.error || 'Erro desconhecido na extração Mistral');

        const mistralData = functionData.data;

        // Se o Mistral retornou opções (modo proposal), usamos diretamente
        if (mistralData.options && Array.isArray(mistralData.options)) {
          finalData = {
            client_name: mistralData.client_name || mistralData.nome_cliente || '',
            options: mistralData.options
          };
        } else {
          // Fallback antigo (Mapeia o resultado de Apólice para Orçamento)
          finalData = {
            client_name: mistralData.nome_cliente || '',
            options: [
              {
                insurer_name: mistralData.nome_seguradora || 'Seguradora a definir',
                plan_name: 'Plano Principal',
                price_annual: mistralData.premio_total || 0,
                price_monthly: mistralData.premio_total ? +(mistralData.premio_total / 10).toFixed(2) : 0,
                deductible: '',
                coverage_items: ['Cobertura Principal Extraída via IA'],
                is_recommended: true
              }
            ]
          };
        }


      } catch (ocrError: any) {
        console.warn('OCR Mistral falhou, acionando fallback local...', ocrError);
        setUploadProgress('Extraindo dados localmente (Fallback)...');
        
        try {
          finalData = await parsePDFLocalFallback(file);
          usedFallback = true;
        } catch (fallbackError) {
          throw new Error('Falha na extração OCR Mistral e no Fallback local.');
        }
      }

      // 4. Sucesso!
      setUploadProgress('Concluído!');
      if (usedFallback) {
        toast.success('Extração local (Fallback) usada com sucesso!', {
          description: 'Revisão manual recomendada.',
        });
      } else {
        toast.success('Dados estruturados extraídos via IA com sucesso!');
      }
      
      // Chamar callback com os dados processados
      onDataExtracted(finalData);

    } catch (error: any) {
      console.error('Erro no processamento:', error);
      const errorMsg = error.message || 'Erro ao processar PDF';
      toast.error(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
        id="pdf-upload"
      />
      
      <label htmlFor="pdf-upload">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled || isUploading}
          asChild
        >
          <span className="cursor-pointer flex items-center justify-center gap-2">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{uploadProgress}</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Importar Orçamento (PDF)</span>
              </>
            )}
          </span>
        </Button>
      </label>

      {isUploading && (
        <p className="text-xs text-muted-foreground text-center">
          Aguarde enquanto processamos seu arquivo...
        </p>
      )}
    </div>
  );
}
