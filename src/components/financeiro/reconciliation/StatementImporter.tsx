import { useState, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, FlaskConical, ArrowLeft, ArrowRight, Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppCard } from '@/components/ui/app-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/ui/stepper';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';

interface StatementImporterProps {
    bankAccountId: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedEntry {
    transaction_date: string;
    description: string;
    amount: number;
    reference_number?: string;
}

const WIZARD_STEPS = ['Upload', 'Revisão', 'Auditoria', 'Confirmação'];

export function StatementImporter({ bankAccountId, onClose, onSuccess }: StatementImporterProps) {
    const [wizardStep, setWizardStep] = useState(1);
    const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [auditorName, setAuditorName] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ count: number; total: number } | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string>('manual_import');

    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Parser simples para CSV
    const parseCSV = (content: string): ParsedEntry[] => {
        const lines = content.trim().split('\n');
        if (lines.length < 2) return [];

        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('data') ||
            firstLine.includes('date') ||
            firstLine.includes('descrição') ||
            firstLine.includes('description');

        const dataLines = hasHeader ? lines.slice(1) : lines;
        const entries: ParsedEntry[] = [];

        for (const line of dataLines) {
            const cells = line.split(/[,;]/).map(c => c.trim().replace(/^["']|["']$/g, ''));

            if (cells.length >= 3) {
                let dateStr = cells[0];
                let description = cells[1];
                let amountStr = cells[2];

                let date: Date | null = null;

                const brDateMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (brDateMatch) {
                    date = new Date(`${brDateMatch[3]}-${brDateMatch[2]}-${brDateMatch[1]}`);
                }

                if (!date) {
                    const isoDateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                    if (isoDateMatch) {
                        date = new Date(dateStr);
                    }
                }

                if (!date || isNaN(date.getTime())) continue;

                const amount = parseFloat(
                    amountStr
                        .replace(/[^\d,.-]/g, '')
                        .replace(',', '.')
                );

                if (isNaN(amount)) continue;

                entries.push({
                    transaction_date: date.toISOString().split('T')[0],
                    description: description || 'Transação importada',
                    amount,
                    reference_number: cells[3] || undefined,
                });
            }
        }

        return entries;
    };

    // Parser robusto para OFX
    const parseOFX = (content: string): ParsedEntry[] => {
        const entries: ParsedEntry[] = [];
        const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
        let match;

        while ((match = stmtTrnRegex.exec(content)) !== null) {
            const txnContent = match[1];
            const dateMatch = txnContent.match(/<DTPOSTED>(\d{8})/);
            const amountMatch = txnContent.match(/<TRNAMT>([+-]?[\d.,]+)/);
            const memoMatch = txnContent.match(/<MEMO>([^<\r\n]+)/);
            const nameMatch = txnContent.match(/<NAME>([^<\r\n]+)/);
            const fitidMatch = txnContent.match(/<FITID>([^<\r\n]+)/);
            const typeMatch = txnContent.match(/<TRNTYPE>([^<\r\n]+)/);

            if (dateMatch && amountMatch) {
                const dateStr = dateMatch[1];
                const date = new Date(
                    parseInt(dateStr.substring(0, 4)),
                    parseInt(dateStr.substring(4, 6)) - 1,
                    parseInt(dateStr.substring(6, 8))
                );

                const amountRaw = amountMatch[1].replace(',', '.');
                const amount = parseFloat(amountRaw);
                const description = (memoMatch?.[1] || nameMatch?.[1] || typeMatch?.[1] || 'Transação OFX').trim();

                if (!isNaN(amount) && !isNaN(date.getTime())) {
                    entries.push({
                        transaction_date: date.toISOString().split('T')[0],
                        description,
                        amount,
                        reference_number: fitidMatch?.[1]?.trim(),
                    });
                }
            }
        }

        return entries;
    };

    const detectOFXCharset = (content: string): string | null => {
        const charsetMatch = content.match(/CHARSET[:\s]*(\S+)/i);
        if (charsetMatch) {
            const charset = charsetMatch[1].toUpperCase().replace(/[^A-Z0-9-]/g, '');
            if (charset === '1252' || charset === 'WINDOWS-1252') return 'windows-1252';
            if (charset.includes('8859') || charset.includes('LATIN')) return 'iso-8859-1';
        }
        return null;
    };

    const handleFile = useCallback((file: File) => {
        setError(null);
        setUploadedFileName(file.name);
        const isOFX = file.name.toLowerCase().endsWith('.ofx');
        const initialEncoding = isOFX ? 'iso-8859-1' : 'utf-8';

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            let entries: ParsedEntry[] = [];

            if (isOFX) {
                const declaredCharset = detectOFXCharset(content);
                if (declaredCharset && declaredCharset !== initialEncoding) {
                    const reReader = new FileReader();
                    reReader.onload = (re) => {
                        const reContent = re.target?.result as string;
                        const reEntries = parseOFX(reContent);
                        if (reEntries.length === 0) {
                            setError('Nenhuma transação válida encontrada no arquivo OFX.');
                            return;
                        }
                        setParsedEntries(reEntries);
                        setWizardStep(2);
                    };
                    reReader.readAsText(file, declaredCharset);
                    return;
                }
                entries = parseOFX(content);
            } else if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')) {
                entries = parseCSV(content);
            } else {
                setError('Formato de arquivo não suportado. Use CSV, TXT ou OFX.');
                return;
            }

            if (entries.length === 0) {
                setError('Nenhuma transação válida encontrada no arquivo.');
                return;
            }

            setParsedEntries(entries);
            setWizardStep(2);
        };

        reader.onerror = () => {
            setError('Erro ao ler o arquivo.');
        };

        reader.readAsText(file, initialEncoding);
    }, []);

    const handleGenerateTestData = useCallback(() => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const testEntries: ParsedEntry[] = [
            { transaction_date: today.toISOString().split('T')[0], description: 'Recebimento Cliente A', amount: 5000.00, reference_number: 'TEST-001' },
            { transaction_date: today.toISOString().split('T')[0], description: 'Pgto Fornecedor B', amount: -1200.50, reference_number: 'TEST-002' },
            { transaction_date: yesterday.toISOString().split('T')[0], description: 'Tarifa Bancária', amount: -15.90, reference_number: 'TEST-003' },
        ];

        setParsedEntries(testEntries);
        setWizardStep(2);
        setError(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleImport = async () => {
        if (!user || !auditorName.trim()) return;
        setIsImporting(true);

        try {
            const batchId = crypto.randomUUID();
            const totalAmount = parsedEntries.reduce((s, e) => s + Math.abs(e.amount), 0);

            // 1. Insert into bank_import_history
            const { error: historyError } = await supabase
                .from('bank_import_history')
                .insert({
                    id: batchId,
                    bank_account_id: bankAccountId,
                    imported_by: user.id,
                    auditor_name: auditorName.trim(),
                    file_name: uploadedFileName,
                    total_transactions: parsedEntries.length,
                    total_amount: totalAmount,
                    status: 'completed',
                });

            if (historyError) throw historyError;

            // 2. Insert all entries with shared batch ID
            const entriesToInsert = parsedEntries.map(entry => ({
                user_id: user.id,
                bank_account_id: bankAccountId,
                transaction_date: entry.transaction_date,
                description: entry.description,
                amount: entry.amount,
                reference_number: entry.reference_number || null,
                reconciliation_status: 'pending',
                import_batch_id: batchId,
            }));

            const { error: entriesError } = await (supabase as any)
                .from('bank_statement_entries')
                .insert(entriesToInsert);

            if (entriesError) throw entriesError;

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['import-history'] });

            setImportResult({ count: parsedEntries.length, total: totalAmount });
            setWizardStep(4);
            toast.success(`${parsedEntries.length} transações importadas com sucesso!`);
        } catch (err: any) {
            setError(err.message || 'Erro ao importar transações.');
            toast.error(`Erro na importação: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    const totalRevenue = parsedEntries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const totalExpense = parsedEntries.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <AppCard className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Importar Extrato Bancário</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Stepper */}
                <div className="px-4 pt-4">
                    <Stepper steps={WIZARD_STEPS} currentStep={wizardStep} />
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-auto">
                    {/* Step 1: Upload */}
                    {wizardStep === 1 && (
                        <>
                            <div
                                className={cn(
                                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                                    isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                                )}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                            >
                                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-foreground font-medium mb-2">
                                    Arraste um arquivo aqui ou clique para selecionar
                                </p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Formatos suportados: CSV, OFX, TXT
                                </p>
                                <input
                                    type="file"
                                    accept=".csv,.ofx,.txt"
                                    onChange={handleFileInput}
                                    className="hidden"
                                    id="file-input"
                                />
                                <Button asChild variant="outline">
                                    <label htmlFor="file-input" className="cursor-pointer">
                                        Selecionar Arquivo
                                    </label>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 gap-1.5 text-muted-foreground"
                                    onClick={handleGenerateTestData}
                                >
                                    <FlaskConical className="w-4 h-4" />
                                    Gerar Dados de Teste
                                </Button>
                            </div>

                            {error && (
                                <Alert variant="destructive" className="mt-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="mt-6 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground mb-2">Formato CSV esperado:</p>
                                <code className="block bg-muted p-2 rounded text-xs">
                                    Data;Descrição;Valor;Referência<br />
                                    01/02/2024;PIX Recebido;1500.00;ABC123<br />
                                    02/02/2024;Pagamento Boleto;-350.00;DEF456
                                </code>
                            </div>
                        </>
                    )}

                    {/* Step 2: Preview / Review */}
                    {wizardStep === 2 && (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                <span className="font-medium">{parsedEntries.length} transações encontradas</span>
                            </div>

                            <div className="max-h-64 overflow-auto space-y-1.5">
                                {parsedEntries.map((entry, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2.5 bg-muted/50 rounded border border-border/50">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate max-w-md">{entry.description}</p>
                                            <p className="text-xs text-muted-foreground">{entry.transaction_date}</p>
                                        </div>
                                        <p className={cn('font-semibold text-sm shrink-0 ml-3', entry.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                            {formatCurrency(entry.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 space-y-1">
                                <div className="p-3 bg-muted/50 rounded flex justify-between">
                                    <span className="text-sm">Total de entradas:</span>
                                    <span className="font-medium text-emerald-400">+{formatCurrency(totalRevenue)}</span>
                                </div>
                                <div className="p-3 bg-muted/50 rounded flex justify-between">
                                    <span className="text-sm">Total de saídas:</span>
                                    <span className="font-medium text-red-400">{formatCurrency(totalExpense)}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 3: Audit Info */}
                    {wizardStep === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                                <UserCheck className="w-8 h-8 text-primary shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-foreground">Informações de Auditoria</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Registre quem está realizando esta importação para fins de rastreabilidade.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="auditor-name">Quem está auditando esta importação? *</Label>
                                <Input
                                    id="auditor-name"
                                    placeholder="Ex: Maria Silva"
                                    value={auditorName}
                                    onChange={(e) => setAuditorName(e.target.value)}
                                    maxLength={100}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Este nome será registrado no histórico de importações.
                                </p>
                            </div>

                            <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
                                <p className="text-sm font-medium text-foreground">Resumo da importação:</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">Transações:</span>
                                    <span className="font-semibold text-right">{parsedEntries.length}</span>
                                    <span className="text-muted-foreground">Entradas:</span>
                                    <span className="font-semibold text-emerald-400 text-right">+{formatCurrency(totalRevenue)}</span>
                                    <span className="text-muted-foreground">Saídas:</span>
                                    <span className="font-semibold text-red-400 text-right">{formatCurrency(totalExpense)}</span>
                                </div>
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    {/* Step 4: Confirmation */}
                    {wizardStep === 4 && importResult && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h4 className="text-lg font-bold text-foreground mb-2">Importação Concluída!</h4>
                            <p className="text-muted-foreground mb-1">
                                <span className="font-semibold text-foreground">{importResult.count}</span> transações importadas
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                                Auditor: <span className="font-medium text-foreground">{auditorName}</span>
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border">
                                <span className="text-sm text-muted-foreground">Volume total:</span>
                                <span className="font-bold text-foreground">{formatCurrency(importResult.total)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between gap-2 p-4 border-t border-border">
                    <div>
                        {(wizardStep === 2 || wizardStep === 3) && (
                            <Button variant="outline" onClick={() => {
                                if (wizardStep === 2) {
                                    setWizardStep(1);
                                    setParsedEntries([]);
                                } else {
                                    setWizardStep(2);
                                }
                            }}>
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Voltar
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {wizardStep === 4 ? (
                            <Button onClick={() => { onSuccess(); }}>
                                Fechar
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={onClose}>
                                    Cancelar
                                </Button>
                                {wizardStep === 2 && (
                                    <Button onClick={() => setWizardStep(3)} className="gap-2">
                                        Continuar
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                )}
                                {wizardStep === 3 && (
                                    <Button
                                        onClick={handleImport}
                                        disabled={isImporting || !auditorName.trim()}
                                        className="gap-2"
                                    >
                                        {isImporting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Importando...
                                            </>
                                        ) : (
                                            <>
                                                Importar {parsedEntries.length} Transações
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </AppCard>
        </div>
    );
}
