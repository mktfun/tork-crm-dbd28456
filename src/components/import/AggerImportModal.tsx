import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { parseAggerCSV, processAggerImport, ImportStats } from '@/services/importService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface AggerImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AggerImportModal({ open, onOpenChange }: AggerImportModalProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState<ImportStats | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null);
            setProgress(0);
        }
    };

    const handleImport = async () => {
        if (!file || !user) return;

        setIsProcessing(true);
        try {
            const parsedData = await parseAggerCSV(file);

            if (parsedData.length === 0) {
                toast.error('O arquivo parece estar vazio ou inválido.');
                setIsProcessing(false);
                return;
            }

            const result = await processAggerImport(parsedData, user.id, (prog) => {
                setProgress(prog);
            });

            setStats(result);
            toast.success('Importação concluída com sucesso!');

            // Atualizar listas
            queryClient.invalidateQueries({ queryKey: ['policies'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });

        } catch (error) {
            console.error('Erro na importação:', error);
            toast.error('Ocorreu um erro durante a importação.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset state after close
        setTimeout(() => {
            setFile(null);
            setStats(null);
            setProgress(0);
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Importar do Agger</DialogTitle>
                    <DialogDescription>
                        Selecione o arquivo CSV exportado do Agger para importar clientes e apólices.
                    </DialogDescription>
                </DialogHeader>

                {!stats ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="agger-file">Arquivo CSV / Excel</Label>
                            <Input
                                id="agger-file"
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                                ref={fileInputRef}
                            />
                        </div>

                        {isProcessing && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Processando...</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Importação Concluída</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Processamento finalizado. Veja o resumo abaixo.
                            </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
                                <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                                <div className="text-xs text-green-700">Sucesso</div>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                                <div className="text-xs text-red-700">Erros</div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {!stats ? (
                        <>
                            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                                Cancelar
                            </Button>
                            <Button onClick={handleImport} disabled={!file || isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Importar
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleClose}>
                            Fechar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
