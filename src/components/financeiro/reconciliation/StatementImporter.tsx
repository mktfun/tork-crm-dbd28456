import { useState, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppCard } from '@/components/ui/app-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useImportStatementEntries } from '@/hooks/useReconciliation';
import { formatCurrency } from '@/utils/formatCurrency';

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

export function StatementImporter({ bankAccountId, onClose, onSuccess }: StatementImporterProps) {
    const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const importMutation = useImportStatementEntries();

    // Parser simples para CSV
    const parseCSV = (content: string): ParsedEntry[] => {
        const lines = content.trim().split('\n');
        if (lines.length < 2) return [];

        // Detectar se primeira linha é header
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
                // Tentar identificar colunas
                // Formato esperado: Data, Descrição, Valor (ou variações)
                let dateStr = cells[0];
                let description = cells[1];
                let amountStr = cells[2];

                // Tentar parsear data
                let date: Date | null = null;

                // Formato DD/MM/YYYY
                const brDateMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (brDateMatch) {
                    date = new Date(`${brDateMatch[3]}-${brDateMatch[2]}-${brDateMatch[1]}`);
                }

                // Formato YYYY-MM-DD
                if (!date) {
                    const isoDateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                    if (isoDateMatch) {
                        date = new Date(dateStr);
                    }
                }

                if (!date || isNaN(date.getTime())) continue;

                // Parsear valor
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

    // Parser robusto para OFX (suporta formatos de bancos brasileiros)
    const parseOFX = (content: string): ParsedEntry[] => {
        const entries: ParsedEntry[] = [];

        // Regex para encontrar transações OFX
        const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
        let match;

        while ((match = stmtTrnRegex.exec(content)) !== null) {
            const txnContent = match[1];

            // Extrair campos — DTPOSTED pode ter timezone: 20230115120000[-3:BRT]
            const dateMatch = txnContent.match(/<DTPOSTED>(\d{8})/);
            // TRNAMT pode usar vírgula ou ponto como decimal
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

                // Normalizar valor: trocar vírgula por ponto
                const amountRaw = amountMatch[1].replace(',', '.');
                const amount = parseFloat(amountRaw);

                // Descrição: prioriza MEMO, fallback NAME, fallback TRNTYPE
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

    // Detecta charset do header OFX (CHARSET:1252, CHARSET:ISO-8859-1, etc.)
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

        const isOFX = file.name.toLowerCase().endsWith('.ofx');

        // OFX brasileiros geralmente usam ISO-8859-1 ou windows-1252
        const initialEncoding = isOFX ? 'iso-8859-1' : 'utf-8';

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;

            let entries: ParsedEntry[] = [];

            if (isOFX) {
                // Verificar se o charset declarado é diferente do usado
                const declaredCharset = detectOFXCharset(content);
                if (declaredCharset && declaredCharset !== initialEncoding) {
                    // Re-ler com o charset correto
                    const reReader = new FileReader();
                    reReader.onload = (re) => {
                        const reContent = re.target?.result as string;
                        const reEntries = parseOFX(reContent);
                        if (reEntries.length === 0) {
                            setError('Nenhuma transação válida encontrada no arquivo OFX.');
                            return;
                        }
                        setParsedEntries(reEntries);
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
            {
                transaction_date: today.toISOString().split('T')[0],
                description: 'Recebimento Cliente A',
                amount: 5000.00,
                reference_number: 'TEST-001',
            },
            {
                transaction_date: today.toISOString().split('T')[0],
                description: 'Pgto Fornecedor B',
                amount: -1200.50,
                reference_number: 'TEST-002',
            },
            {
                transaction_date: yesterday.toISOString().split('T')[0],
                description: 'Tarifa Bancária',
                amount: -15.90,
                reference_number: 'TEST-003',
            },
        ];

        setParsedEntries(testEntries);
        setError(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleImport = async () => {
        await importMutation.mutateAsync({
            bankAccountId,
            entries: parsedEntries,
        });
        onSuccess();
    };

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

                {/* Content */}
                <div className="p-4 flex-1 overflow-auto">
                    {parsedEntries.length === 0 ? (
                        <>
                            {/* Drop Zone */}
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                    }`}
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

                            {/* Instruções */}
                            <div className="mt-6 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground mb-2">Formato CSV esperado:</p>
                                <code className="block bg-muted p-2 rounded text-xs">
                                    Data;Descrição;Valor;Referência<br />
                                    01/02/2024;PIX Recebido;1500.00;ABC123<br />
                                    02/02/2024;Pagamento Boleto;-350.00;DEF456
                                </code>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Preview das transações */}
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                <span className="font-medium">{parsedEntries.length} transações encontradas</span>
                            </div>

                            <div className="max-h-64 overflow-auto space-y-2">
                                {parsedEntries.map((entry, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                        <div>
                                            <p className="text-sm font-medium truncate max-w-md">{entry.description}</p>
                                            <p className="text-xs text-muted-foreground">{entry.transaction_date}</p>
                                        </div>
                                        <p className={`font-semibold ${entry.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(entry.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 p-3 bg-muted/50 rounded flex justify-between">
                                <span className="text-sm">Total de entradas:</span>
                                <span className="font-medium text-emerald-400">
                                    +{formatCurrency(parsedEntries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0))}
                                </span>
                            </div>
                            <div className="p-3 bg-muted/50 rounded flex justify-between mt-1">
                                <span className="text-sm">Total de saídas:</span>
                                <span className="font-medium text-red-400">
                                    {formatCurrency(parsedEntries.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0))}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t border-border">
                    {parsedEntries.length > 0 && (
                        <Button variant="outline" onClick={() => setParsedEntries([])}>
                            Escolher Outro Arquivo
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    {parsedEntries.length > 0 && (
                        <Button
                            onClick={handleImport}
                            disabled={importMutation.isPending}
                            className="gap-2"
                        >
                            {importMutation.isPending ? 'Importando...' : `Importar ${parsedEntries.length} Transações`}
                        </Button>
                    )}
                </div>
            </AppCard>
        </div>
    );
}
