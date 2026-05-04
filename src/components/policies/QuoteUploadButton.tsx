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

      setUploadProgress('Extraindo dados do PDF...');

      // 3. Extração Local Direta (sem usar IA/Gemini)
      let finalData = null;

      try {
        finalData = await parsePDFLocalFallback(file);
      } catch (fallbackError) {
        throw new Error('Falha na leitura e extração do PDF.');
      }

      // 4. Sucesso!
      setUploadProgress('Concluído!');
      toast.success('Dados extraídos do PDF com sucesso!');
      
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
