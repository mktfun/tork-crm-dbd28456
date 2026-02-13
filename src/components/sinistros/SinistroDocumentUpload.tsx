import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const documentTypes = [
  'Boletim de Ocorrência',
  'Laudo Pericial',
  'Orçamento',
  'Nota Fiscal',
  'Foto do Sinistro',
  'CNH',
  'Documento do Veículo',
  'Comprovante de Propriedade',
  'Outros'
];

interface DocumentFile {
  file: File;
  type: string;
  id: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
}

interface SinistroDocumentUploadProps {
  sinistroId: string;
  onSuccess?: () => void;
}

export function SinistroDocumentUpload({ sinistroId, onSuccess }: SinistroDocumentUploadProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    const newFiles: DocumentFile[] = selectedFiles.map(file => ({
      file,
      type: '', // User will select this
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'uploading' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const updateFileType = (fileId: string, type: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, type } : f
    ));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFiles = async () => {
    if (!user?.id) return;

    const filesToUpload = files.filter(f => f.type && f.status !== 'success');
    if (filesToUpload.length === 0) {
      toast.error('Selecione o tipo de documento para todos os arquivos');
      return;
    }

    setIsUploading(true);

    try {
      for (const fileData of filesToUpload) {
        // Update progress
        setFiles(prev => prev.map(f =>
          f.id === fileData.id ? { ...f, progress: 10 } : f
        ));

        // Generate unique filename
        const fileExt = fileData.file.name.split('.').pop();
        const fileName = `${sinistroId}/${Date.now()}-${fileData.id}.${fileExt}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('sinistro-documents')
          .upload(fileName, fileData.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Update progress
        setFiles(prev => prev.map(f =>
          f.id === fileData.id ? { ...f, progress: 70 } : f
        ));

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('sinistro-documents')
          .getPublicUrl(fileName);

        // Save document record in database
        const { error: dbError } = await supabase
          .from('sinistro_documents')
          .insert({
            sinistro_id: sinistroId,
            user_id: user.id,
            document_type: fileData.type,
            file_name: fileData.file.name,
            file_url: urlData.publicUrl,
            file_size: fileData.file.size,
            mime_type: fileData.file.type,
            is_required: false,
            is_validated: false
          });

        if (dbError) throw dbError;

        // Mark as complete
        setFiles(prev => prev.map(f =>
          f.id === fileData.id ? {
            ...f,
            progress: 100,
            status: 'success' as const,
            url: urlData.publicUrl
          } : f
        ));
      }

      toast.success('Documentos enviados com sucesso!');
      onSuccess?.();

      // Clear successful uploads after delay
      setTimeout(() => {
        setFiles(prev => prev.filter(f => f.status !== 'success'));
      }, 2000);

    } catch (error) {
      console.error('Erro ao enviar documentos:', error);
      toast.error('Erro ao enviar documentos');

      // Mark failed uploads
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const })));
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-5 h-5 text-blue-400" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="w-5 h-5 text-red-400" />;
    }
    return <File className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground/40 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">
          Clique aqui ou arraste arquivos para enviar documentos
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Formatos aceitos: PDF, JPG, PNG, DOC, DOCX (máx. 10MB cada)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-foreground font-medium">Arquivos selecionados:</h4>

          {files.map((fileData) => (
            <div key={fileData.id} className="bg-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFileIcon(fileData.file.name)}
                  <div>
                    <p className="text-foreground font-medium text-sm">{fileData.file.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {fileData.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {fileData.status === 'error' && (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  )}
                  {fileData.status === 'uploading' && fileData.progress > 0 && (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileData.id)}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Document Type Selector */}
              {fileData.status !== 'success' && (
                <Select
                  value={fileData.type}
                  onValueChange={(value) => updateFileType(fileData.id, value)}
                  disabled={isUploading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Progress Bar */}
              {fileData.status === 'uploading' && fileData.progress > 0 && (
                <div className="space-y-1">
                  <Progress value={fileData.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Enviando... {fileData.progress}%
                  </p>
                </div>
              )}

              {/* Success/Error Messages */}
              {fileData.status === 'success' && (
                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-400">
                    Documento enviado com sucesso!
                  </AlertDescription>
                </Alert>
              )}

              {fileData.status === 'error' && (
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-400">
                    Erro ao enviar documento. Tente novamente.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ))}

          {/* Upload Button */}
          <div className="flex justify-end">
            <Button
              onClick={uploadFiles}
              disabled={isUploading || files.every(f => f.status === 'success' || !f.type)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Upload className="w-4 h-4 mr-2" />
              Enviar Documentos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
