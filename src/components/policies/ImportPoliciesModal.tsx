import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Upload, FileText, Check, AlertCircle, Loader2, UserCheck, UserPlus, X, Sparkles, Clock, AlertTriangle, Zap, Eye, ExternalLink, Car, Plus, ChevronDown, Search, Unlink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseCompanies } from '@/hooks/useSupabaseCompanies';
import { useSupabaseProducers } from '@/hooks/useSupabaseProducers';
import { useSupabaseRamos } from '@/hooks/useSupabaseRamos';
import { useSupabaseBrokerages } from '@/hooks/useSupabaseBrokerages';
// usePolicies removido - agora usamos executePolicyImport diretamente
import { useIsMobile } from '@/hooks/use-mobile';
import { useAllClients } from '@/hooks/useAllClients';
import { cn } from '@/lib/utils';
import { PDFDocument } from 'pdf-lib';
import {
  ExtractedPolicyData,
  PolicyImportItem,
  BulkOCRExtractedPolicy,
  BulkOCRResponse,
  DocumentType,
  ImportError
} from '@/types/policyImport';
import {
  reconcileClient,
  matchSeguradora,
  matchRamo,
  createClient,
  createClientFromEdited,
  uploadPolicyPdf,
  validateImportItem,
  classifyImportError,
  createSeguradora,
  createRamo,
  saveApoliceItens,
  upsertClientByDocument,
  executePolicyImport,
  PolicyImportResult
} from '@/services/policyImportService';
import { getFriendlyErrorMessage, getValidationErrors } from '@/services/errorMessages';
import { calculateConfidenceScore, getConfidenceBadge } from '@/services/confidenceScore';
import { useAppStore } from '@/store';
// v11.0: Mistral Intelligence - OCR + LLM Pipeline
import { useQueryClient } from '@tanstack/react-query';
import { ClientSearchCombobox } from '@/components/crm/ClientSearchCombobox';

interface ImportPoliciesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'processing' | 'review' | 'complete';
type FileProcessingStatus = 'pending' | 'processing' | 'success' | 'error';
type BulkProcessingPhase = 'ocr' | 'ai' | 'reconciling' | 'storage';

interface ProcessingMetrics {
  totalDurationSec: string;
  ocrDurationSec?: string;
  aiDurationSec?: string;
  filesProcessed: number;
  policiesExtracted: number;
}

interface ExtendedBulkOCRResponse extends BulkOCRResponse {
  metrics?: ProcessingMetrics;
}

const sanitizePremio = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const clean = value.replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }
  return 0;
};

// =====================================================
// v9.0: SMART EARLY-STOPPING - Verifica completude dos dados
// =====================================================
interface DataCompletenessResult {
  complete: boolean;
  missing: string[];
}

/**
 * v9.0: Verifica se os dados extraídos estão completos para early-stopping
 * Retorna true se todos os campos críticos foram preenchidos
 */
const isDataComplete = (data: any): DataCompletenessResult => {
  // v12.2: Campos absolutamente obrigatórios
  const REQUIRED_FIELDS = [
    'nome_cliente',     // Nome do segurado
    'numero_apolice',   // Número da apólice
    'nome_seguradora',  // Seguradora
    'data_inicio',      // Início da vigência
    'data_fim'          // Fim da vigência
  ];

  const missing: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = data?.[field];
    if (value === null || value === undefined || value === '' || value === 'N/A') {
      missing.push(field);
    }
  }

  // CPF/CNPJ: deve ter 11 ou 14 dígitos se presente
  const cpf = data?.cpf_cnpj;
  if (!cpf || (cpf.length !== 11 && cpf.length !== 14)) {
    missing.push('cpf_cnpj');
  }

  // Prêmio: pelo menos um dos dois deve ter valor > 0
  const hasValidPremium = (data?.premio_liquido > 0) || (data?.premio_total > 0);
  if (!hasValidPremium) {
    missing.push('premio');
  }

  // v12.3: Log de diagnóstico com número de página
  if (missing.length > 0) {
    console.log(`📊 [COMPLETENESS v12.3] Faltando ${missing.length}: ${missing.join(', ')}`);
  }

  return {
    complete: missing.length === 0,
    missing
  };
};

// =====================================================
// PREMIUM STEPPER COMPONENT - BLACK & SILVER
// =====================================================
interface StepperProps {
  phase: BulkProcessingPhase;
}

const PremiumStepper = ({ phase }: StepperProps) => {
  const steps = [
    { id: 'ocr', label: 'OCR Mistral' },
    { id: 'ai', label: 'IA Extração' },
    { id: 'reconciling', label: 'Vincular' },
    { id: 'storage', label: 'Salvar PDF' },
  ];

  const getStepStatus = (stepId: string) => {
    const order = ['ocr', 'ai', 'reconciling', 'storage'];
    const currentIdx = order.indexOf(phase);
    const stepIdx = order.indexOf(stepId);
    if (stepIdx < currentIdx) return 'complete';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="flex items-center justify-center gap-0 px-8 py-4 border-b border-border/30">
      {steps.map((step, idx) => {
        const status = getStepStatus(step.id);
        return (
          <div key={step.id} className="contents">
            <div className={cn(
              "flex items-center gap-2 transition-all duration-300",
              status === 'active' && "scale-105",
            )}>
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                status === 'complete' && "border-primary bg-primary/15 text-primary",
                status === 'active' && "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                status === 'pending' && "border-border bg-muted/30 text-muted-foreground",
              )}>
                {status === 'complete' ? (
                  <Check className="w-4 h-4" />
                ) : status === 'active' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs">{idx + 1}</span>
                )}
              </div>
              <span className={cn(
                "text-sm font-medium transition-colors",
                status === 'complete' && "text-foreground",
                status === 'active' && "text-primary font-semibold",
                status === 'pending' && "text-muted-foreground",
              )}>
                {step.label}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div className={cn(
                "w-12 h-0.5 mx-3 transition-all duration-500",
                getStepStatus(steps[idx + 1].id) !== 'pending'
                  ? "bg-primary"
                  : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export function ImportPoliciesModal({ open, onOpenChange }: ImportPoliciesModalProps) {
  const { user } = useAuth();
  const { companies } = useSupabaseCompanies();
  const { producers } = useSupabaseProducers();
  const { data: ramos = [] } = useSupabaseRamos();
  const { brokerages } = useSupabaseBrokerages();
  // addPolicy removido - agora usamos executePolicyImport do service layer
  const activeBrokerageId = useAppStore(state => state.activeBrokerageId);
  const setActiveBrokerage = useAppStore(state => state.setActiveBrokerage);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // v5.5: Hook para busca de clientes
  const { allClients, loading: loadingClients } = useAllClients();

  useEffect(() => {
    if (!activeBrokerageId && brokerages.length > 0 && open) {
      console.log('🏢 [AUTO] Selecionando primeira corretora:', brokerages[0].id);
      setActiveBrokerage(brokerages[0].id.toString());
      toast.info(`Corretora "${brokerages[0].name}" selecionada automaticamente`);
    }
  }, [activeBrokerageId, brokerages, setActiveBrokerage, open]);

  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<PolicyImportItem[]>([]);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, errors: 0 });
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [processingStatus, setProcessingStatus] = useState<Map<number, FileProcessingStatus>>(new Map());

  const [batchProducerId, setBatchProducerId] = useState<string>('');
  const [batchCommissionRate, setBatchCommissionRate] = useState<string>('');

  const [bulkPhase, setBulkPhase] = useState<BulkProcessingPhase>('ocr');
  const [ocrProgress, setOcrProgress] = useState(0);

  const [processingMetrics, setProcessingMetrics] = useState<ProcessingMetrics | null>(null);

  // Section 6: Timer states for elapsed/remaining time
  const [elapsedSec, setElapsedSec] = useState(0);
  const processingStartRef = useRef<number>(0);
  const processingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Split View: Selected item for PDF preview
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = useMemo(() =>
    items.find(i => i.id === selectedItemId) || items[0],
    [items, selectedItemId]
  );

  // Mobile: Drawer for PDF preview
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const [editedFields, setEditedFields] = useState<Map<string, Set<string>>>(new Map());

  // v5.5: Estado para busca de cliente no popover
  const [showClientSearchFor, setShowClientSearchFor] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // v5.5: Handler para trocar cliente vinculado
  const handleClientChange = useCallback((itemId: string, newClientId: string) => {
    const selectedClient = allClients.find(c => c.id === newClientId);
    if (selectedClient) {
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? {
            ...item,
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            clientCpfCnpj: selectedClient.cpfCnpj || item.clientCpfCnpj,
            clientStatus: 'matched',
            matchedBy: 'cpf_cnpj'
          }
          : item
      ));
      markFieldEdited(itemId, 'clientName');
      setShowClientSearchFor(null);
      toast.success(`Cliente alterado para: ${selectedClient.name}`);
    }
  }, [allClients]);

  // v5.5: Handler para desvincular cliente
  const handleUnlinkClient = useCallback((itemId: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? {
          ...item,
          clientId: undefined,
          clientStatus: 'new',
          matchedBy: undefined
        }
        : item
    ));
    toast.info('Cliente desvinculado');
  }, []);

  // v5.5: Buscar detalhes do cliente no cache
  const getClientDetails = useCallback((clientId: string | undefined) => {
    if (!clientId) return null;
    return allClients.find(c => c.id === clientId);
  }, [allClients]);

  const resetModal = useCallback(() => {
    setStep('upload');
    setFiles([]);
    setItems([]);
    setProcessingIndex(0);
    setImportResults({ success: 0, errors: 0 });
    setImportErrors([]);
    setBatchProducerId('');
    setBatchCommissionRate('');
    setProcessingStatus(new Map());
    setBulkPhase('ocr');
    setOcrProgress(0);
    setProcessingMetrics(null);
    setSelectedItemId(null);
    setMobilePreviewOpen(false);
    setEditedFields(new Map());
    setShowClientSearchFor(null);
    setProcessingLabel('');
    if (processingTickRef.current) clearInterval(processingTickRef.current);
    setElapsedSec(0);
  }, []);

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  const markFieldEdited = (itemId: string, field: string) => {
    setEditedFields(prev => {
      const newMap = new Map(prev);
      const fields = newMap.get(itemId) || new Set();
      fields.add(field);
      newMap.set(itemId, fields);
      return newMap;
    });
  };

  const isFieldEdited = (itemId: string, field: string): boolean => {
    return editedFields.get(itemId)?.has(field) || false;
  };

  const handlePremioChange = (itemId: string, rawValue: string) => {
    let cleaned = rawValue.replace(/[^\d,.-]/g, '');
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    const numValue = parseFloat(cleaned) || 0;
    markFieldEdited(itemId, 'premioLiquido');
    const item = items.find(i => i.id === itemId);
    if (item) {
      updateItem(itemId, {
        premioLiquido: numValue,
        estimatedCommission: numValue * (item.commissionRate / 100)
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const MAX_SIZE = 5 * 1024 * 1024;

    const validFiles = selectedFiles.filter(file => {
      if (file.size > MAX_SIZE) {
        toast.warning(`${file.name} ignorado: maior que 5MB`);
        return false;
      }
      if (!(file.type === 'application/pdf' || file.type.startsWith('image/'))) {
        toast.warning(`${file.name} ignorado: apenas PDFs e imagens são aceitos.`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const validFiles = droppedFiles.filter(file =>
      file.type === 'application/pdf' || file.type.startsWith('image/')
    );

    if (validFiles.length !== droppedFiles.length) {
      toast.warning('Alguns arquivos foram ignorados. Apenas PDFs e imagens são aceitos.');
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ========== CLIENT-SIDE PDF SLICER (v6.1) ==========
  /**
   * Converte Uint8Array para Base64 de forma segura (sem stack overflow)
   * Usa Blob + FileReader em vez de String.fromCharCode.apply
   */
  const bytesToBase64Safe = (bytes: Uint8Array): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Cria um novo ArrayBuffer a partir dos bytes para evitar SharedArrayBuffer
      const newBuffer = new ArrayBuffer(bytes.length);
      const newView = new Uint8Array(newBuffer);
      newView.set(bytes);

      const blob = new Blob([newBuffer], { type: 'application/pdf' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Remove o prefixo "data:application/pdf;base64,"
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  /**
   * Extrai um range de páginas do PDF no cliente
   * Retorna: { sliceBase64, totalPages, hasMore }
   */
  const slicePdfPages = async (
    file: File,
    startPage: number,
    endPage: number
  ): Promise<{
    sliceBase64: string;
    totalPages: number;
    hasMore: boolean;
    actualStart: number;
    actualEnd: number;
  }> => {
    // 1. Lê arquivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 2. Carrega PDF
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();

    // 3. Ajusta range
    const actualStart = Math.max(1, startPage);
    const actualEnd = Math.min(endPage, totalPages);

    if (actualStart > totalPages) {
      return {
        sliceBase64: '',
        totalPages,
        hasMore: false,
        actualStart,
        actualEnd: 0
      };
    }

    // 4. Cria novo PDF com apenas as páginas solicitadas
    const newDoc = await PDFDocument.create();
    for (let i = actualStart - 1; i < actualEnd; i++) {
      const [page] = await newDoc.copyPages(pdfDoc, [i]);
      newDoc.addPage(page);
    }

    // 5. Converte para Base64 de forma SEGURA (sem stack overflow!)
    const pdfBytes = await newDoc.save();
    const sliceBase64 = await bytesToBase64Safe(pdfBytes);

    console.log(`✂️ [SLICER v6.1] Páginas ${actualStart}-${actualEnd} de ${totalPages} (${(sliceBase64.length / 1024).toFixed(0)}KB)`);

    return {
      sliceBase64,
      totalPages,
      hasMore: actualEnd < totalPages,
      actualStart,
      actualEnd
    };
  };

  // ========== v12.3: MISTRAL INTELLIGENCE PIPELINE ==========
  // Fluxo: PDF → Mistral OCR → Markdown → Mistral LLM → JSON
  // Frontend fatia 2 em 2 páginas para evitar timeouts
  // v12.3: REMOVIDO limite de chunks - processa até encontrar dados ou fim do PDF

  const PAGES_PER_CHUNK = 2;
  const MAX_CHUNKS = 999; // v12.3: Sem limite artificial - processa o PDF inteiro se necessário

  // Estado de descrição da etapa atual
  const [processingLabel, setProcessingLabel] = useState<string>('');

  /**
   * Merge de resultados parciais de múltiplos chunks
   * Prioriza valores não-nulos e mais completos
   */
  const mergeChunkResults = (chunks: any[]): any => {
    if (chunks.length === 0) return null;
    if (chunks.length === 1) return chunks[0];

    const merged: any = {};
    const fields = [
      'nome_cliente', 'cpf_cnpj', 'email', 'telefone', 'endereco_completo',
      'numero_apolice', 'numero_proposta', 'nome_seguradora', 'ramo_seguro',
      'data_inicio', 'data_fim', 'objeto_segurado', 'placa',
      'premio_liquido', 'premio_total'
    ];

    for (const field of fields) {
      // Para cada campo, pega o primeiro valor não-nulo/não-vazio
      for (const chunk of chunks) {
        const value = chunk?.[field];
        if (value !== null && value !== undefined && value !== '') {
          // Para strings, prefere o valor mais longo (mais completo)
          if (typeof value === 'string' && typeof merged[field] === 'string') {
            if (value.length > merged[field].length) {
              merged[field] = value;
            }
          } else if (merged[field] === undefined || merged[field] === null) {
            merged[field] = value;
          }
        }
      }
    }

    console.log(`🔀 [MERGE] ${chunks.length} chunks consolidados`);
    return merged;
  };

  const processFilesWithMistral = async () => {
    if (!user || files.length === 0) return;

    setStep('processing');
    setBulkPhase('ocr');
    setOcrProgress(0);
    setProcessingMetrics(null);

    // Start timer
    processingStartRef.current = Date.now();
    setElapsedSec(0);
    processingTickRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - processingStartRef.current) / 1000));
    }, 1000);

    const fileMap = new Map<string, File>();
    files.forEach(f => fileMap.set(f.name, f));

    const initialStatus = new Map<number, FileProcessingStatus>();
    files.forEach((_, i) => initialStatus.set(i, 'pending'));
    setProcessingStatus(initialStatus);

    const startTime = performance.now();
    const results: BulkOCRExtractedPolicy[] = [];
    const errors: { fileName: string; error: string }[] = [];

    // v11.0: Process each file via MISTRAL OCR + LLM pipeline
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      setProcessingStatus(prev => new Map(prev).set(idx, 'processing'));
      setOcrProgress(idx);

      try {
        console.log(`📄 [${idx + 1}/${files.length}] Processando: ${file.name}`);
        setProcessingLabel(`Lendo ${file.name}...`);

        const isImage = file.type.startsWith('image/');
        let finalExtracted: any;

        if (isImage) {
          // Imagens: envio direto para Mistral
          setBulkPhase('ocr');
          setProcessingLabel('Processando imagem com OCR Mistral...');

          const sliceBase64 = await fileToBase64(file);

          const { data, error } = await supabase.functions.invoke('analyze-policy-mistral', {
            body: {
              base64: sliceBase64,
              fileName: file.name,
              mimeType: file.type,
            }
          });

          if (error || !data?.success) {
            throw new Error(data?.error || error?.message || 'Extração falhou');
          }

          finalExtracted = data.data;
          console.log(`✅ [MISTRAL] Imagem processada em ${data.durationMs}ms`);

        } else {
          // PDFs: Chunking de 2 em 2 páginas com limite de 3 tentativas
          const chunkResults: any[] = [];
          let currentPage = 1;
          let hasMore = true;
          let totalPages = 0;
          let earlyStopTriggered = false;
          let pagesProcessed = 0;
          let chunkCount = 0;

          while (hasMore && chunkCount < MAX_CHUNKS) {
            const endPage = currentPage + PAGES_PER_CHUNK - 1;

            setBulkPhase('ocr');
            setProcessingLabel(`Lendo páginas ${currentPage}-${endPage}...`);

            const slice = await slicePdfPages(file, currentPage, endPage);
            totalPages = slice.totalPages;
            hasMore = slice.hasMore;

            if (!slice.sliceBase64) {
              console.log(`⚠️ [CHUNK] Sem conteúdo para páginas ${currentPage}-${endPage}`);
              currentPage = endPage + 1;
              continue;
            }

            setBulkPhase('ai');
            setProcessingLabel(`Extraindo dados págs ${slice.actualStart}-${slice.actualEnd}...`);

            console.log(`🔄 [MISTRAL v11] Páginas ${slice.actualStart}-${slice.actualEnd} de ${totalPages}`);

            const { data, error } = await supabase.functions.invoke('analyze-policy-mistral', {
              body: {
                base64: slice.sliceBase64,
                fileName: `${file.name}_p${currentPage}-${endPage}`,
                mimeType: 'application/pdf',
              }
            });

            if (error) {
              console.warn(`⚠️ [CHUNK] Erro págs ${currentPage}-${endPage}:`, error.message);
            } else if (data?.success && data.data) {
              chunkResults.push(data.data);
              pagesProcessed = slice.actualEnd;
              chunkCount++;

              const ocrMs = data.metrics?.ocrMs || 0;
              const llmMs = data.metrics?.llmMs || 0;
              console.log(`✅ [MISTRAL] Págs ${currentPage}-${endPage}: OCR ${ocrMs}ms + LLM ${llmMs}ms = ${data.durationMs}ms`);

              // v12.3: EARLY-STOP CHECK - NUNCA confiar apenas no status do LLM
              const currentMerged = mergeChunkResults(chunkResults);
              const completeness = isDataComplete(currentMerged);
              const isComplete = completeness.complete; // Ignora data.data.status

              // Log de trust issue se LLM mentir
              if (data.data.status === 'COMPLETO' && !completeness.complete) {
                console.warn(`⚠️ [TRUST ISSUE v12.3] LLM disse COMPLETO mas faltam: ${completeness.missing.join(', ')}`);
              }

              if (isComplete) {
                const pagesSkipped = totalPages - slice.actualEnd;
                earlyStopTriggered = true;
                console.log(`✅ [EARLY-STOP v12.3] Dados completos após ${chunkResults.length} chunk(s)!`);
                if (pagesSkipped > 0) {
                  console.log(`💰 [ECONOMIA v12.3] Pulando ${pagesSkipped} páginas restantes`);
                }
                break;
              } else {
                console.log(`⏳ [CONTINUE v12.3] Pág ${slice.actualEnd}/${totalPages} - Faltando: ${completeness.missing.join(', ')}`);
              }
            }

            currentPage = endPage + 1;
          }

          if (chunkResults.length === 0) {
            throw new Error('Nenhum chunk extraído com sucesso');
          }

          // Merge dos resultados de todos os chunks
          finalExtracted = mergeChunkResults(chunkResults);

          // Log final
          const statusLabel = earlyStopTriggered ? '⚡ EARLY-STOP' : '📄 COMPLETO';
          console.log(`✅ [MISTRAL v12.3] ${file.name}: ${pagesProcessed}/${totalPages} págs em ${chunkResults.length} chunk(s) [${statusLabel}]`);
        }

        // v11.0: Fase de reconciliação/enrichment
        setBulkPhase('reconciling');
        setProcessingLabel('Vinculando ao cadastro de clientes...');

        // Se tem documento válido, faz upsert automático de cliente
        let autoClientId: string | undefined;
        let autoClientName: string | undefined;

        if (finalExtracted.cpf_cnpj) {
          const upsertResult = await upsertClientByDocument(
            finalExtracted.cpf_cnpj,
            finalExtracted.nome_cliente || 'Cliente Importado',
            finalExtracted.email,
            finalExtracted.telefone,
            finalExtracted.endereco_completo,
            user.id
          );
          if (upsertResult) {
            autoClientId = upsertResult.id;
            autoClientName = upsertResult.name;
            console.log(`✅ [UPSERT] Cliente: ${autoClientName} (${upsertResult.created ? 'criado' : 'existente'})`);
          }
        }

        // Converte para formato BulkOCRExtractedPolicy
        // v9.0: Detecta tipo de documento (APOLICE ou CARTEIRINHA)
        const tipoDocumento = finalExtracted.tipo_documento || 'APOLICE';

        const bulkPolicy: BulkOCRExtractedPolicy = {
          nome_cliente: autoClientName || finalExtracted.nome_cliente || 'Cliente Não Identificado',
          cpf_cnpj: finalExtracted.cpf_cnpj,
          email: finalExtracted.email,
          telefone: finalExtracted.telefone,
          endereco_completo: finalExtracted.endereco_completo,
          tipo_documento: tipoDocumento as DocumentType,
          numero_apolice: finalExtracted.numero_apolice || '',
          numero_proposta: finalExtracted.numero_proposta,
          tipo_operacao: null,
          endosso_motivo: null,
          nome_seguradora: finalExtracted.nome_seguradora || finalExtracted.operadora || '',
          ramo_seguro: finalExtracted.ramo_seguro || (tipoDocumento === 'CARTEIRINHA' ? 'SAUDE' : ''),
          data_inicio: finalExtracted.data_inicio || '',
          data_fim: finalExtracted.data_fim || finalExtracted.validade_cartao || '',
          descricao_bem: finalExtracted.objeto_segurado,
          objeto_segurado: finalExtracted.objeto_segurado,
          identificacao_adicional: finalExtracted.placa || null,
          premio_liquido: finalExtracted.premio_liquido || 0,
          premio_total: finalExtracted.premio_total || finalExtracted.premio_liquido || 0,
          titulo_sugerido: `${finalExtracted.nome_cliente || 'Cliente'} - ${finalExtracted.ramo_seguro || 'Seguro'} (${finalExtracted.nome_seguradora || ''})`.substring(0, 100),
          arquivo_origem: file.name,
          // NOVOS CAMPOS - Carteirinha
          numero_carteirinha: finalExtracted.numero_carteirinha || null,
          operadora: finalExtracted.operadora || null,
          validade_cartao: finalExtracted.validade_cartao || null,
        };

        results.push(bulkPolicy);
        setProcessingStatus(prev => new Map(prev).set(idx, 'success'));

      } catch (err: any) {
        console.error(`❌ [FAIL] ${file.name}:`, err.message);
        errors.push({ fileName: file.name, error: err.message });
        setProcessingStatus(prev => new Map(prev).set(idx, 'error'));
        // Continue with next files (don't break the loop)
      }
    }

    setOcrProgress(files.length);

    // Stop timer
    if (processingTickRef.current) clearInterval(processingTickRef.current);

    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    setProcessingMetrics({
      totalDurationSec: totalDuration,
      filesProcessed: files.length,
      policiesExtracted: results.length,
    });

    if (results.length === 0) {
      toast.error('Nenhum arquivo processado com sucesso');
      if (errors.length > 0) {
        toast.error(`Erros: ${errors.map(e => e.fileName).join(', ')}`);
      }
      setStep('upload');
      return;
    }

    // Show toast with stats
    if (errors.length > 0) {
      toast.warning(`${results.length} processados, ${errors.length} com erro`);
    } else {
      toast.success(`${results.length} arquivo(s) processados com sucesso!`);
    }

    // ========== RECONCILIATION PHASE ==========
    setBulkPhase('reconciling');

    const processedItems: PolicyImportItem[] = await Promise.all(
      results.map(async (policy) => {
        const file = fileMap.get(policy.arquivo_origem) || files[0];

        const extracted: ExtractedPolicyData = {
          cliente: {
            nome_completo: policy.nome_cliente,
            cpf_cnpj: policy.cpf_cnpj,
            email: policy.email,
            telefone: policy.telefone,
            endereco_completo: policy.endereco_completo || null,
          },
          apolice: {
            numero_apolice: policy.numero_apolice,
            nome_seguradora: policy.nome_seguradora,
            data_inicio: policy.data_inicio,
            data_fim: policy.data_fim,
            ramo_seguro: policy.ramo_seguro,
          },
          objeto_segurado: {
            descricao_bem: policy.descricao_bem || policy.objeto_segurado || '',
          },
          valores: {
            premio_liquido: sanitizePremio(policy.premio_liquido),
            premio_total: sanitizePremio(policy.premio_total),
          },
        };

        const clientResult = await reconcileClient(extracted, user.id);
        const seguradoraMatch = await matchSeguradora(policy.nome_seguradora, user.id);
        const ramoMatch = await matchRamo(policy.ramo_seguro, user.id, seguradoraMatch?.id);

        // v5.1: Use directly the objeto_segurado formatted by the parser
        // Avoid duplicating plate info since parser already includes it
        const objetoCompleto = policy.objeto_segurado || policy.descricao_bem || '';

        // v5.2: Prioriza nome do banco quando cliente já existe
        const clientNameToUse = clientResult.clientName || policy.nome_cliente || 'Cliente Não Identificado';

        // v5.2: Fallback de prêmio líquido se vier zerado
        const premioLiquidoFinal = sanitizePremio(policy.premio_liquido) || sanitizePremio(policy.premio_total) || 0;
        const premioTotalFinal = sanitizePremio(policy.premio_total) || premioLiquidoFinal;

        const item: PolicyImportItem = {
          id: crypto.randomUUID(),
          file,
          filePreviewUrl: URL.createObjectURL(file),
          fileName: policy.arquivo_origem,
          extracted,
          clientStatus: clientResult.status,
          clientId: clientResult.clientId,
          clientName: clientNameToUse,
          clientCpfCnpj: policy.cpf_cnpj,
          matchedBy: clientResult.matchedBy,
          seguradoraId: seguradoraMatch?.id || null,
          seguradoraNome: policy.nome_seguradora,
          ramoId: ramoMatch?.id || null,
          ramoNome: policy.ramo_seguro,
          producerId: null,
          commissionRate: 15,
          numeroApolice: policy.numero_apolice || policy.numero_proposta || '',
          dataInicio: policy.data_inicio,
          dataFim: policy.data_fim,
          objetoSegurado: objetoCompleto,
          premioLiquido: premioLiquidoFinal,
          premioTotal: premioTotalFinal,
          tipoDocumento: policy.tipo_documento || null,
          tipoOperacao: policy.tipo_operacao || null,
          endossoMotivo: policy.endosso_motivo || null,
          tituloSugerido: policy.titulo_sugerido || '',
          identificacaoAdicional: policy.identificacao_adicional || null,
          estimatedCommission: premioLiquidoFinal * 0.15,
          isValid: false,
          validationErrors: [],
          isProcessing: false,
          isProcessed: true,
        };

        item.validationErrors = validateImportItem(item);
        item.isValid = item.validationErrors.length === 0;

        // v7.1: Calculate confidence score
        item.confidenceScore = calculateConfidenceScore(item);

        return item;
      })
    );

    setItems(processedItems);
    if (processedItems.length > 0) {
      setSelectedItemId(processedItems[0].id);
    }

    toast.success(`${processedItems.length} apólice(s) pronta(s) para revisão!`);
    setStep('review');
  };

  // v11.0: Mistral Intelligence Pipeline
  const processBulkOCR = processFilesWithMistral;

  const updateItem = (id: string, updates: Partial<PolicyImportItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, ...updates };

      if ('commissionRate' in updates) {
        updated.estimatedCommission = updated.premioLiquido * (updated.commissionRate / 100);
      }

      updated.validationErrors = validateImportItem(updated);
      updated.isValid = updated.validationErrors.length === 0;

      return updated;
    }));
  };

  const applyBatchProducer = () => {
    if (!batchProducerId) return;
    setItems(prev => prev.map(item => {
      const updated = { ...item, producerId: batchProducerId };
      updated.validationErrors = validateImportItem(updated);
      updated.isValid = updated.validationErrors.length === 0;
      return updated;
    }));
    toast.success('Produtor aplicado a todas as apólices');
  };

  const applyBatchCommission = () => {
    const rate = parseFloat(batchCommissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Taxa de comissão inválida');
      return;
    }
    setItems(prev => prev.map(item => {
      const updated = {
        ...item,
        commissionRate: rate,
        estimatedCommission: item.premioLiquido * (rate / 100)
      };
      updated.validationErrors = validateImportItem(updated);
      updated.isValid = updated.validationErrors.length === 0;
      return updated;
    }));
    toast.success('Comissão aplicada a todas as apólices');
  };

  const processImport = async () => {
    if (!user) return;

    const validItems = items.filter(item => item.isValid);
    if (validItems.length === 0) {
      toast.error('Nenhuma apólice válida para importar');
      return;
    }

    // v5.4: Função de validação rigorosa de nome
    const isNameSuspicious = (name: string | null): boolean => {
      if (!name?.trim()) return true;
      if (name === 'Cliente Não Identificado') return true;
      if (name === 'Não Identificado') return true;
      if (name.toUpperCase().includes('NÃO IDENTIFICADO')) return true;
      if (name.toUpperCase().includes('NAO IDENTIFICADO')) return true;
      if (name.length > 60) return true;
      if (name.split(' ').length > 5) return true;

      const upper = name.toUpperCase();
      const suspiciousTerms = ['AGORA', 'VOCE', 'PODE', 'PROGRAMA', 'BENEFICIO', 'REALIZAR', 'TERMOS', 'CONDICOES'];
      if (suspiciousTerms.some(t => upper.includes(t))) return true;

      return false;
    };

    const invalidClients = validItems.filter(item => isNameSuspicious(item.clientName));

    if (invalidClients.length > 0) {
      toast.error(`${invalidClients.length} item(s) com nome de cliente inválido. Edite o nome antes de salvar!`, {
        description: 'Campos com borda vermelha precisam ser corrigidos manualmente.',
        duration: 6000,
      });
      return;
    }

    if (!activeBrokerageId) {
      toast.error('Erro de configuração: corretora não selecionada.');
      return;
    }

    setStep('processing');
    setProcessingIndex(0);
    setImportErrors([]);

    // v4.0: Fallback para produtor padrão (primeiro da lista)
    const defaultProducerId = batchProducerId || producers[0]?.id || null;
    console.log(`🔧 [IMPORT] Produtor padrão: ${defaultProducerId || 'N/A'}`);

    let success = 0;
    let errors = 0;
    const collectedErrors: ImportError[] = [];

    // 🎯 **REFATORADO**: Usa executePolicyImport do Service Layer
    for (let i = 0; i < validItems.length; i++) {
      setProcessingIndex(i);
      const item = validItems[i];

      try {
        const result: PolicyImportResult = await executePolicyImport(
          item,
          user.id,
          activeBrokerageId,
          { defaultProducerId: defaultProducerId || undefined }
        );

        if (result.success) {
          success++;

          // Log de comissão (informativo)
          if (result.commissionCreated) {
            console.log(`💰 [IMPORT] Comissão criada para: ${item.numeroApolice}`);
          } else if (result.commissionError) {
            console.warn(`⚠️ [IMPORT] Comissão falhou (apólice OK): ${result.commissionError}`);
          }
        } else {
          errors++;
          const friendlyMsg = getFriendlyErrorMessage(result.error);
          collectedErrors.push({
            fileName: item.fileName,
            errorMessage: friendlyMsg,
            errorCode: result.errorCode || 'UNKNOWN',
            itemId: item.id,
            clientName: item.clientName || '',
            stage: 'apolice' as const,
          });
          console.error(`❌ [IMPORT] ${item.fileName}: ${friendlyMsg}`);
        }
      } catch (error: any) {
        console.error('❌ [ERROR] Falha inesperada ao importar:', item.fileName, error);

        const importError = classifyImportError(error, item);
        collectedErrors.push(importError);
        errors++;
      }
    }

    // Invalidar queries para atualizar UI
    queryClient.invalidateQueries({ queryKey: ['policies'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });

    setImportErrors(collectedErrors);
    setImportResults({ success, errors });
    setStep('complete');
  };

  const validCount = items.filter(i => i.isValid).length;
  const invalidCount = items.filter(i => !i.isValid).length;

  const getProgressValue = () => {
    if (bulkPhase === 'ocr') {
      return (ocrProgress / Math.max(files.length, 1)) * 50;
    }
    if (bulkPhase === 'ai') {
      return 75;
    }
    return 90;
  };

  const getPhaseLabel = () => {
    if (bulkPhase === 'ocr') {
      return `Lendo documentos (${Math.min(ocrProgress + 1, files.length)} de ${files.length})...`;
    }
    if (bulkPhase === 'ai') {
      return 'IA extraindo informações da apólice...';
    }
    if (bulkPhase === 'reconciling') {
      return 'Vinculando ao cadastro de clientes...';
    }
    if (bulkPhase === 'storage') {
      return 'Salvando documentos...';
    }
    return 'Processando...';
  };

  // =====================================================
  // PDF PREVIEW PANEL COMPONENT (BLACK & SILVER)
  // =====================================================
  const PdfPreviewPanel = ({ item, className }: { item: PolicyImportItem | null; className?: string }) => (
    <div className={cn("h-full bg-zinc-950/50 backdrop-blur-lg flex flex-col", className)}>
      {item?.filePreviewUrl ? (
        <>
          <div className="flex-shrink-0 px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <span className="text-xs text-zinc-400 truncate">{item.fileName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:bg-white/10 text-zinc-400 hover:text-white"
              onClick={() => window.open(item.filePreviewUrl, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <iframe
              src={item.filePreviewUrl}
              className="w-full h-full border-0"
              title="Preview do documento"
            />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
          <div className="text-center">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Clique em uma linha para visualizar o PDF</p>
          </div>
        </div>
      )}
    </div>
  );

  // =====================================================
  // REVIEW TABLE ROW COMPONENT - BLACK & SILVER
  // =====================================================
  const ReviewTableRow = ({ item, isSelected }: { item: PolicyImportItem; isSelected: boolean }) => (
    <TableRow
      onClick={() => setSelectedItemId(item.id)}
      className={cn(
        "border-b border-white/5 transition-all cursor-pointer group",
        isSelected
          ? "bg-white/5 border-l-2 border-l-zinc-400"
          : "hover:bg-white/[0.02]"
      )}
    >
      {/* Cliente */}
      <TableCell className="py-3">
        {!item.processError && (
          <div className="space-y-1.5">
            {(() => {
              // v5.4: Validação visual rigorosa de nome
              const isNameInvalid = !item.clientName?.trim() ||
                item.clientName === 'Cliente Não Identificado' ||
                item.clientName === 'Não Identificado' ||
                item.clientName.length > 60 ||
                item.clientName.split(' ').length > 5 ||
                ['AGORA', 'VOCE', 'PODE', 'PROGRAMA', 'BENEFICIO', 'REALIZAR'].some(t =>
                  item.clientName?.toUpperCase().includes(t)
                );

              return (
                <Input
                  value={isNameInvalid && !isFieldEdited(item.id, 'clientName') ? '' : item.clientName}
                  onChange={(e) => {
                    markFieldEdited(item.id, 'clientName');
                    updateItem(item.id, { clientName: e.target.value });
                  }}
                  className={cn(
                    "h-8 bg-transparent border-zinc-700/50 text-sm font-medium transition-all",
                    "focus:bg-zinc-900/50 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20",
                    isNameInvalid && "border-red-500/50 bg-red-900/10 animate-pulse",
                    isFieldEdited(item.id, 'clientName') && "text-zinc-300 border-zinc-500/50"
                  )}
                  placeholder={isNameInvalid ? "⚠️ Digite o nome do cliente" : "Nome do Cliente"}
                />
              );
            })()}
            <div className="flex items-center gap-2">
              {/* v12.3: CPF/CNPJ com validação visual melhorada */}
              {(() => {
                const cpf = item.clientCpfCnpj;
                const isValid = cpf && (cpf.length === 11 || cpf.length === 14);
                const isEmpty = !cpf || cpf.length === 0;
                return (
                  <Input
                    value={cpf || ''}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, '');
                      markFieldEdited(item.id, 'clientCpfCnpj');
                      updateItem(item.id, {
                        clientCpfCnpj: onlyDigits,
                        clientStatus: 'new'
                      });
                    }}
                    className={cn(
                      "h-6 text-xs bg-transparent border-zinc-700/50 px-2 w-36 transition-all font-mono",
                      "focus:bg-zinc-900/50 focus:border-zinc-400",
                      (isEmpty || !isValid) && "border-red-500/50 bg-red-900/10",
                      isFieldEdited(item.id, 'clientCpfCnpj') && "text-zinc-300 border-zinc-500/50"
                    )}
                    placeholder="CPF/CNPJ obrigatório"
                    maxLength={14}
                  />
                );
              })()}
              {item.clientStatus === 'matched' ? (
                <Popover open={showClientSearchFor === item.id} onOpenChange={(open) => setShowClientSearchFor(open ? item.id : null)}>
                  <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Badge className="bg-zinc-700/30 text-zinc-200 border border-zinc-500/40 text-[10px] h-5 cursor-pointer hover:bg-zinc-600/40 transition-colors">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Vinculado
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-zinc-900/95 border-zinc-700 p-0 z-[200]" side="top" sideOffset={8}>
                    {/* Header */}
                    <div className="p-3 border-b border-zinc-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-200 font-medium text-sm flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-green-400" />
                          Cliente Vinculado
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-zinc-400 border-zinc-600">
                          {item.matchedBy === 'cpf_cnpj' && 'CPF/CNPJ'}
                          {item.matchedBy === 'email' && 'E-mail'}
                          {item.matchedBy === 'name_fuzzy' && 'Nome (85%+)'}
                          {item.matchedBy === 'auto_created' && '✨ Auto-criado'}
                        </Badge>
                      </div>
                    </div>

                    {/* Dados do Cliente */}
                    <div className="p-3 space-y-2 text-xs">
                      {(() => {
                        const clientDetails = getClientDetails(item.clientId);
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500">Nome:</span>
                              <span className="text-zinc-200 font-medium truncate max-w-[180px]">{item.clientName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500">CPF/CNPJ:</span>
                              <span className="text-zinc-300 font-mono text-[11px]">
                                {item.clientCpfCnpj
                                  ? item.clientCpfCnpj.length === 11
                                    ? `${item.clientCpfCnpj.slice(0, 3)}.${item.clientCpfCnpj.slice(3, 6)}.${item.clientCpfCnpj.slice(6, 9)}-${item.clientCpfCnpj.slice(9)}`
                                    : item.clientCpfCnpj.length === 14
                                      ? `${item.clientCpfCnpj.slice(0, 2)}.${item.clientCpfCnpj.slice(2, 5)}.${item.clientCpfCnpj.slice(5, 8)}/${item.clientCpfCnpj.slice(8, 12)}-${item.clientCpfCnpj.slice(12)}`
                                      : item.clientCpfCnpj
                                  : 'Não informado'}
                              </span>
                            </div>
                            {clientDetails?.phone && (
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-500">Telefone:</span>
                                <span className="text-zinc-300">{clientDetails.phone}</span>
                              </div>
                            )}
                            {clientDetails?.email && (
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-500">Email:</span>
                                <span className="text-zinc-300 truncate max-w-[160px]">{clientDetails.email}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Busca de Cliente (v5.5) */}
                    <div className="p-3 border-t border-zinc-700/50 space-y-2">
                      <p className="text-zinc-500 text-[10px]">Trocar cliente vinculado:</p>
                      <ClientSearchCombobox
                        clients={allClients.map(c => ({
                          id: c.id,
                          name: c.name,
                          phone: c.phone || '',
                          email: c.email || ''
                        }))}
                        value={item.clientId || ''}
                        onValueChange={(newClientId) => handleClientChange(item.id, newClientId)}
                        isLoading={loadingClients}
                        placeholder="Buscar cliente..."
                      />
                    </div>

                    {/* Ações */}
                    <div className="p-2 border-t border-zinc-700/50 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-7 text-xs text-zinc-400 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkClient(item.id);
                          setShowClientSearchFor(null);
                        }}
                      >
                        <Unlink className="w-3 h-3 mr-1" />
                        Desvincular
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Badge className="bg-transparent text-zinc-400 border border-zinc-600/50 text-[10px] h-5">
                  <UserPlus className="w-3 h-3 mr-1" />
                  Novo
                </Badge>
              )}
            </div>
          </div>
        )}
      </TableCell>

      {/* Apólice + Prêmio */}
      <TableCell className="py-3">
        {!item.processError && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 flex-wrap">
              {item.tipoDocumento === 'PROPOSTA' && (
                <Badge variant="outline" className="text-zinc-400 border-zinc-600/40 text-[10px] h-4 px-1">
                  📋 Proposta
                </Badge>
              )}
              {item.tipoDocumento === 'ORCAMENTO' && (
                <Badge variant="outline" className="text-zinc-400 border-zinc-600/40 text-[10px] h-4 px-1">
                  💰 Orçamento
                </Badge>
              )}
              {item.tipoDocumento === 'ENDOSSO' && (
                <Badge variant="outline" className="text-zinc-400 border-zinc-600/40 text-[10px] h-4 px-1">
                  📝 Endosso
                </Badge>
              )}
              {item.tipoOperacao === 'RENOVACAO' && (
                <Badge variant="outline" className="text-zinc-400 border-zinc-600/40 text-[10px] h-4 px-1">
                  🔄 Renovação
                </Badge>
              )}
            </div>

            <Input
              value={item.numeroApolice}
              onChange={(e) => {
                markFieldEdited(item.id, 'numeroApolice');
                updateItem(item.id, { numeroApolice: e.target.value });
              }}
              className={cn(
                "h-7 bg-transparent border-zinc-700/50 text-sm font-medium transition-all",
                "focus:bg-zinc-900/50 focus:border-zinc-400",
                !item.numeroApolice && "border-red-500/50 bg-red-900/10",
                isFieldEdited(item.id, 'numeroApolice') && "text-zinc-300 border-zinc-500/50"
              )}
              placeholder="Nº Apólice"
            />

            <div className="flex items-center gap-1">
              <span className="text-zinc-600 text-xs">R$</span>
              <Input
                type="text"
                value={item.premioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                onChange={(e) => handlePremioChange(item.id, e.target.value)}
                className={cn(
                  "h-6 w-24 bg-transparent border-zinc-700/50 text-xs px-2 transition-all",
                  "focus:bg-zinc-900/50 focus:border-zinc-400",
                  item.premioLiquido === 0 && "border-red-500/50 bg-red-900/10 text-red-400",
                  isFieldEdited(item.id, 'premioLiquido') && "text-zinc-300 border-zinc-500/50"
                )}
                placeholder="0,00"
              />
            </div>
          </div>
        )}
      </TableCell>

      {/* Vigência - NOVA COLUNA v12.1 */}
      <TableCell className="py-3">
        {!item.processError && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <span className="text-zinc-600 text-[10px] w-7">De:</span>
              <Input
                type="date"
                value={item.dataInicio || ''}
                onChange={(e) => {
                  markFieldEdited(item.id, 'dataInicio');
                  updateItem(item.id, { dataInicio: e.target.value });
                }}
                className={cn(
                  "h-6 text-xs bg-transparent border-zinc-700/50 px-1.5 w-[110px] transition-all",
                  "focus:bg-zinc-900/50 focus:border-zinc-400",
                  !item.dataInicio && "border-red-500/50 bg-red-900/10",
                  isFieldEdited(item.id, 'dataInicio') && "text-zinc-300 border-zinc-500/50"
                )}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-600 text-[10px] w-7">Até:</span>
              <Input
                type="date"
                value={item.dataFim || ''}
                onChange={(e) => {
                  markFieldEdited(item.id, 'dataFim');
                  updateItem(item.id, { dataFim: e.target.value });
                }}
                className={cn(
                  "h-6 text-xs bg-transparent border-zinc-700/50 px-1.5 w-[110px] transition-all",
                  "focus:bg-zinc-900/50 focus:border-zinc-400",
                  !item.dataFim && "border-red-500/50 bg-red-900/10",
                  isFieldEdited(item.id, 'dataFim') && "text-zinc-300 border-zinc-500/50"
                )}
              />
            </div>
          </div>
        )}
      </TableCell>

      {/* Objeto Segurado */}
      <TableCell className="py-3">
        {!item.processError && (
          <TooltipProvider>
            <div className="space-y-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    value={item.objetoSegurado || ''}
                    onChange={(e) => {
                      markFieldEdited(item.id, 'objetoSegurado');
                      updateItem(item.id, { objetoSegurado: e.target.value });
                    }}
                    className={cn(
                      "h-7 bg-transparent border-zinc-700/50 text-sm transition-all",
                      "focus:bg-zinc-900/50 focus:border-zinc-400",
                      !item.objetoSegurado && item.ramoNome?.toUpperCase().includes('AUTO')
                      && "border-red-500/50 bg-red-900/10 animate-pulse",
                      isFieldEdited(item.id, 'objetoSegurado') && "text-zinc-300 border-zinc-500/50"
                    )}
                    placeholder="VW Golf GTI 2024"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Veículo, imóvel ou bem segurado</p>
                </TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-1">
                <Car className="w-3 h-3 text-zinc-600" />
                <Input
                  value={item.identificacaoAdicional || ''}
                  onChange={(e) => {
                    markFieldEdited(item.id, 'identificacaoAdicional');
                    updateItem(item.id, { identificacaoAdicional: e.target.value.toUpperCase() });
                  }}
                  className={cn(
                    "h-6 text-xs bg-transparent border-zinc-700/50 px-1 w-24 uppercase font-mono transition-all",
                    "focus:bg-zinc-900/50 focus:border-zinc-400",
                    isFieldEdited(item.id, 'identificacaoAdicional') && "text-zinc-300 border-zinc-500/50"
                  )}
                  placeholder="ABC-1D23"
                />
              </div>
            </div>
          </TooltipProvider>
        )}
      </TableCell>

      {/* Seguradora */}
      <TableCell className="py-3">
        {!item.processError && (
          <div className="space-y-1">
            <Select
              value={item.seguradoraId || ''}
              onValueChange={(v) => updateItem(item.id, { seguradoraId: v })}
            >
              <SelectTrigger className={cn(
                "h-8 bg-transparent border-zinc-700/50 text-sm transition-all",
                !item.seguradoraId && "border-red-500/50"
              )}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!item.seguradoraId && item.seguradoraNome && (
              <div className="text-[10px] text-zinc-500 truncate">
                IA: {item.seguradoraNome}
              </div>
            )}
          </div>
        )}
      </TableCell>

      {/* Ramo */}
      <TableCell className="py-3">
        {!item.processError && (
          <div className="space-y-1">
            <Select
              value={item.ramoId || ''}
              onValueChange={(v) => updateItem(item.id, { ramoId: v })}
            >
              <SelectTrigger className={cn(
                "h-8 bg-transparent border-zinc-700/50 text-sm transition-all",
                !item.ramoId && "border-red-500/50"
              )}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {ramos.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!item.ramoId && item.ramoNome && (
              <div className="text-[10px] text-zinc-500 truncate">
                IA: {item.ramoNome}
              </div>
            )}
          </div>
        )}
      </TableCell>

      {/* Produtor */}
      <TableCell className="py-3">
        {!item.processError && (
          <Select
            value={item.producerId || ''}
            onValueChange={(v) => updateItem(item.id, { producerId: v })}
          >
            <SelectTrigger className={cn(
              "h-8 bg-transparent border-zinc-700/50 text-sm transition-all",
              !item.producerId && "border-red-500/50"
            )}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {producers.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>

      {/* Comissão */}
      <TableCell className="py-3">
        {!item.processError && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={item.commissionRate}
                onChange={(e) => updateItem(item.id, { commissionRate: parseFloat(e.target.value) || 0 })}
                className="h-7 w-14 bg-transparent border-zinc-700/50 text-sm text-center"
              />
              <span className="text-zinc-600 text-xs">%</span>
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              R$ {item.estimatedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="py-3">
        {item.isProcessing ? (
          <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
        ) : item.processError ? (
          <AlertTriangle className="w-5 h-5 text-red-400" />
        ) : item.isValid ? (
          <div className="w-6 h-6 rounded-full bg-zinc-700/50 flex items-center justify-center">
            <Check className="w-4 h-4 text-zinc-300" />
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger>
              <div className="w-6 h-6 rounded-full bg-zinc-700/50 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-zinc-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <ul className="text-xs space-y-1">
                {item.validationErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-[98vw] max-w-[98vw] h-[95vh] flex flex-col bg-black/85 backdrop-blur-2xl border border-white/[0.06] p-0 gap-0"
        style={{
          boxShadow: `
            0 0 80px -20px rgba(255,255,255,0.05),
            inset 0 1px 0 0 rgba(255,255,255,0.04)
          `
        }}
      >
        {/* Header - BLACK & SILVER */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-white/5">
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center border border-white/10">
              <Sparkles className="w-4 h-4 text-zinc-200" />
            </div>
            Importar Apólices via IA
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload - BLACK & SILVER */}
        {step === 'upload' && (
          <div className="flex-1 overflow-auto p-6 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-zinc-700/30">
              <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-600/50">
                <Zap className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <p className="text-zinc-200 font-medium text-sm">Importação Inteligente via IA</p>
                <p className="text-zinc-500 text-xs">
                  Envie os PDFs das apólices e a IA extrai automaticamente os dados para você revisar
                </p>
              </div>
            </div>

            <div
              className="border border-dashed border-zinc-700/50 rounded-xl p-10 text-center hover:border-zinc-500/70 hover:bg-white/[0.02] transition-all duration-300 cursor-pointer group"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-16 h-16 mx-auto bg-zinc-900/50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-zinc-800/70 border border-zinc-700/50 group-hover:border-zinc-600 transition-all duration-300">
                <Upload className="w-8 h-8 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>
              <p className="text-white font-medium">
                Arraste PDFs de apólices aqui
              </p>
              <p className="text-zinc-600 text-sm mt-1">ou clique para selecionar arquivos</p>
              <p className="text-zinc-500 text-xs mt-3">
                Aceita PDF e imagens • Máx. 5MB por arquivo
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label className="text-zinc-500 text-sm">Arquivos selecionados ({files.length})</Label>
                <ScrollArea className="h-40 border border-zinc-700/50 rounded-xl bg-zinc-900/30">
                  <div className="p-2 space-y-1">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center border border-zinc-700/50">
                            <FileText className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div>
                            <span className="text-white text-sm">{file.name}</span>
                            <span className="text-zinc-600 text-xs ml-2">
                              ({(file.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={processBulkOCR}
                disabled={files.length === 0}
                className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)]"
              >
                <Zap className="w-4 h-4 mr-2" />
                Processar em Lote ({files.length})
              </Button>
            </div>
            {files.length > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Estimativa: ~{files.length * 10 < 60
                  ? `${files.length * 10}s`
                  : `${Math.ceil((files.length * 10) / 60)} min`
                } para {files.length} arquivo(s)
              </p>
            )}
          </div>
        )}

        {/* Step: Processing (OCR/AI) - BLACK & SILVER */}
        {step === 'processing' && items.length === 0 && (
          <div className="flex-1 overflow-auto flex flex-col">
            <PremiumStepper phase={bulkPhase} />

            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-muted/40 flex items-center justify-center border border-border">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
              </div>

              <div className="text-center">
                <p className="text-white font-medium text-lg">{getPhaseLabel()}</p>
                <p className="text-zinc-500 text-sm mt-1">
                  {processingLabel || (
                    <>
                      {bulkPhase === 'ocr' && 'Extraindo texto com Mistral OCR...'}
                      {bulkPhase === 'ai' && 'Analisando documentos com Mistral LLM...'}
                      {bulkPhase === 'reconciling' && 'Enriquecendo cadastro do cliente...'}
                      {bulkPhase === 'storage' && 'Salvando PDF original no Storage...'}
                    </>
                  )}
                </p>
              </div>

              <Progress value={getProgressValue()} className="w-full max-w-sm h-2" />

              {(() => {
                const done = Math.max(ocrProgress, 1);
                const avgPerFile = elapsedSec / done;
                const remaining = Math.max(0, Math.round(avgPerFile * (files.length - done)));
                const elapsed = elapsedSec < 60
                  ? `${elapsedSec}s`
                  : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;
                const eta = remaining < 60
                  ? `~${remaining}s`
                  : `~${Math.ceil(remaining / 60)} min`;

                return (
                  <div className="flex items-center justify-between text-xs text-muted-foreground w-full max-w-sm">
                    <span>Decorrido: {elapsed}</span>
                    {ocrProgress < files.length && (
                      <span>Restante: {eta}</span>
                    )}
                  </div>
                );
              })()}

              <ScrollArea className="h-40 w-full max-w-md border border-zinc-700/50 rounded-xl bg-zinc-900/30">
                <div className="p-3 space-y-2">
                  {files.map((file, index) => {
                    const status = processingStatus.get(index);
                    return (
                      <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                        <span className="text-sm text-white truncate max-w-[200px]">{file.name}</span>
                        <div className="flex items-center gap-2">
                          {status === 'pending' && <Clock className="w-4 h-4 text-muted-foreground" />}
                          {status === 'processing' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                          {status === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
                          {status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Step: Processing (Saving to DB) - BLACK & SILVER */}
        {step === 'processing' && items.length > 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-muted/40 flex items-center justify-center border border-border">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>

            <div className="text-center">
              <p className="text-white font-medium text-lg">
                Salvando {processingIndex + 1} de {items.filter(i => i.isValid).length}...
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                Criando clientes e apólices
              </p>
            </div>

            <Progress
              value={(processingIndex + 1) / items.filter(i => i.isValid).length * 100}
              className="w-full max-w-sm h-2"
            />
          </div>
        )}

        {/* Step: Review - SPLIT VIEW - BLACK & SILVER */}
        {step === 'review' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Batch Actions Bar */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-white/5 bg-zinc-900/30">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-zinc-500 text-sm font-medium">Aplicar a todos:</span>

                <div className="flex items-center gap-2">
                  <Select value={batchProducerId} onValueChange={setBatchProducerId}>
                    <SelectTrigger className="w-40 h-8 bg-transparent border-zinc-700/50 text-sm">
                      <SelectValue placeholder="Produtor" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {producers.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyBatchProducer}
                    disabled={!batchProducerId}
                    className="h-8 border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white"
                  >
                    Aplicar
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="% Comissão"
                    value={batchCommissionRate}
                    onChange={(e) => setBatchCommissionRate(e.target.value)}
                    className="w-24 h-8 bg-transparent border-zinc-700/50 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyBatchCommission}
                    disabled={!batchCommissionRate}
                    className="h-8 border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white"
                  >
                    Aplicar
                  </Button>
                </div>

                {/* Summary */}
                <div className="ml-auto flex items-center gap-3">
                  <Badge variant="outline" className="text-zinc-300 border-zinc-500/40">
                    {validCount} válidas
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="text-zinc-500 border-zinc-600/40">
                      {invalidCount} pendentes
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Split View - Desktop / Full Table - Mobile */}
            <div className="flex-1 min-h-0">
              {isMobile ? (
                // Mobile: Full table + floating preview button
                <div className="h-full flex flex-col">
                  <ScrollArea className="flex-1">
                    <TooltipProvider>
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm">
                          <TableRow className="border-b border-white/5 hover:bg-transparent">
                            <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Cliente</TableHead>
                            <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Apólice</TableHead>
                            <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Vigência</TableHead>
                            <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Objeto</TableHead>
                            <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Cia</TableHead>
                            <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Ramo</TableHead>
                            <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Produtor</TableHead>
                            <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Com.</TableHead>
                            <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <ReviewTableRow
                              key={item.id}
                              item={item}
                              isSelected={selectedItemId === item.id}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </TooltipProvider>
                  </ScrollArea>

                  {/* Mobile PDF Preview Drawer */}
                  <Drawer open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
                    <DrawerTrigger asChild>
                      <Button
                        className="fixed bottom-24 right-4 rounded-full w-14 h-14 shadow-xl bg-zinc-700 hover:bg-zinc-600 border border-zinc-600"
                      >
                        <Eye className="w-6 h-6" />
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent className="h-[70vh] bg-zinc-950 border-zinc-700">
                      <DrawerHeader className="border-b border-white/5">
                        <DrawerTitle className="text-white">Preview do Documento</DrawerTitle>
                      </DrawerHeader>
                      <PdfPreviewPanel item={selectedItem} className="flex-1" />
                    </DrawerContent>
                  </Drawer>
                </div>
              ) : (
                // Desktop: Split View with ResizablePanels
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  {/* PDF Preview Panel */}
                  <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    <PdfPreviewPanel item={selectedItem} className="border-r border-white/5" />
                  </ResizablePanel>

                  <ResizableHandle withHandle className="bg-white/5 hover:bg-zinc-500/30 transition-colors" />

                  {/* Table Panel */}
                  <ResizablePanel defaultSize={70}>
                    <ScrollArea className="h-full">
                      <TooltipProvider>
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm">
                            <TableRow className="border-b border-white/5 hover:bg-transparent">
                              <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Cliente</TableHead>
                              <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Apólice</TableHead>
                              <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Vigência</TableHead>
                              <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Objeto</TableHead>
                              <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Cia</TableHead>
                              <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Ramo</TableHead>
                              <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Produtor</TableHead>
                              <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Com.</TableHead>
                              <TableHead className="text-zinc-500 text-xs font-medium uppercase tracking-wider w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <ReviewTableRow
                                key={item.id}
                                item={item}
                                isSelected={selectedItemId === item.id}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </TooltipProvider>
                    </ScrollArea>
                  </ResizablePanel>
                </ResizablePanelGroup>
              )}
            </div>

            {/* Footer Actions - BLACK & SILVER */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-white/5 bg-zinc-900/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('upload')}
                  className="border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white"
                >
                  ← Voltar
                </Button>

                {processingMetrics && (
                  <Badge variant="outline" className="bg-zinc-900/50 text-zinc-400 border-zinc-700">
                    <Zap className="w-3 h-3 mr-1 text-zinc-400" />
                    {processingMetrics.totalDurationSec}s
                    <span className="text-zinc-600 mx-2">|</span>
                    <span className="text-zinc-500 text-xs">IA Tork v2.0</span>
                  </Badge>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={processImport}
                  disabled={validCount === 0 || !activeBrokerageId}
                  className={cn(
                    "bg-zinc-100 hover:bg-white text-zinc-950 font-semibold shadow-[0_0_25px_-5px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_-5px_rgba(255,255,255,0.6)]",
                    !activeBrokerageId && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Importar {validCount} Apólice(s)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Complete - BLACK & SILVER */}
        {step === 'complete' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 overflow-auto">
            <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-600/50 shadow-lg shadow-zinc-500/10">
              <Check className="w-10 h-10 text-zinc-200" />
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-semibold text-white">Importação Concluída!</h3>
              <p className="text-zinc-500 mt-2">
                {importResults.success} apólice(s) importada(s) com sucesso
                {importResults.errors > 0 && `, ${importResults.errors} erro(s)`}
              </p>
            </div>

            {processingMetrics && (
              <Badge variant="outline" className="text-zinc-300 border-zinc-500/50 px-4 py-2">
                ⚡ Tempo total: {processingMetrics.totalDurationSec}s
              </Badge>
            )}

            {/* Error Details Table */}
            {importErrors.length > 0 && (
              <Collapsible className="w-full max-w-2xl">
                <CollapsibleTrigger className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors w-full justify-center">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{importErrors.length} erro(s) detalhado(s)</span>
                  <ChevronDown className="w-4 h-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="border border-zinc-700/50 rounded-lg overflow-hidden bg-zinc-900/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-zinc-700/50 hover:bg-transparent">
                          <TableHead className="text-zinc-500 text-xs">Arquivo</TableHead>
                          <TableHead className="text-zinc-500 text-xs">Cliente</TableHead>
                          <TableHead className="text-zinc-500 text-xs">Etapa</TableHead>
                          <TableHead className="text-zinc-500 text-xs">Erro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importErrors.map((err, idx) => (
                          <TableRow key={idx} className="border-b border-zinc-800/50">
                            <TableCell className="text-zinc-400 text-xs max-w-[150px] truncate">{err.fileName}</TableCell>
                            <TableCell className="text-zinc-300 text-xs">{err.clientName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                "text-[10px]",
                                err.stage === 'cliente' && "border-yellow-500/50 text-yellow-400",
                                err.stage === 'upload' && "border-blue-500/50 text-blue-400",
                                err.stage === 'apolice' && "border-red-500/50 text-red-400"
                              )}>
                                {err.stage}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-red-400 text-xs">{err.errorMessage}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Button
              onClick={handleClose}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] px-8"
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
