import { useState, useEffect, useRef } from 'react';
import { Bug, Activity, X, Play, Trash2, TerminalSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

interface LogEntry {
    id: string;
    timestamp: Date;
    level: LogLevel;
    message: string;
    details?: any;
}

interface PageDebuggerProps {
    context: string;
}

export function PageDebugger({ context }: PageDebuggerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Scroll to bottom on new log
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Clear logs on context change
    useEffect(() => {
        setLogs([]);
        addLog('INFO', `Contexto alterado para: ${context}`);
    }, [context]);

    const addLog = (level: LogLevel, message: string, details?: any) => {
        setLogs(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date(),
            level,
            message,
            details
        }]);
    };

    const runFullDiagnostic = async () => {
        setIsRunning(true);
        setLogs([]); // Clear previous run
        addLog('INFO', `Iniciando diagnóstico para contexto: ${context.toUpperCase()}...`);

        try {
            // 1. Connectivity Check
            await testConnectivity();

            // 2. Contract Check (Schema Access)
            await testSchemaAccess();

            // 3. Context Specific Tests
            await runContextTests(context);

            addLog('SUCCESS', 'Diagnóstico concluído com sucesso.');
            toast({
                title: "Diagnóstico Concluído",
                description: "Verifique o log para detalhes.",
            });

        } catch (error: any) {
            addLog('ERROR', 'Falha crítica no diagnóstico', error);
            toast({
                variant: "destructive",
                title: "Falha no Diagnóstico",
                description: error.message || "Erro desconhecido",
            });
        } finally {
            setIsRunning(false);
        }
    };

    const testConnectivity = async () => {
        const start = performance.now();
        addLog('INFO', 'Testando conexão com Supabase...');

        const { count, error } = await supabase
            .from('financial_transactions')
            .select('*', { count: 'exact', head: true });

        if (error) {
            throw new Error(`Conexão falhou: ${error.message}`);
        }

        const duration = (performance.now() - start).toFixed(2);
        addLog('SUCCESS', `Conexão estabelecida (${duration}ms). Total de transações: ${count}`);
    };

    const testSchemaAccess = async () => {
        addLog('INFO', 'Validando acesso a tabelas essenciais...');

        // Check key tables
        const tables = ['financial_transactions', 'financial_categories', 'financial_accounts'];

        for (const table of tables) {
            const { error } = await supabase.from(table as any).select('id').limit(1);
            if (error) {
                addLog('ERROR', `Sem acesso à tabela: ${table}`, error);
            } else {
                addLog('INFO', `Tabela acessível: ${table}`);
            }
        }
    };

    const runContextTests = async (ctx: string) => {
        addLog('INFO', `Executando testes específicos para: ${ctx}`);

        switch (ctx) {
            case 'tesouraria':
                await testTesouraria();
                break;
            case 'caixa': // Bancos
                await testBancos();
                break;
            case 'transacoes':
                await testTransacoes();
                break;
            case 'conciliacao':
                await testConciliacao();
                break;
            default:
                addLog('WARN', `Sem testes específicos implementados para: ${ctx}`);
        }
    };

    // --- Specific Test Suites ---

    const testTesouraria = async () => {
        addLog('INFO', 'Testando RPC: get_aging_report...');

        // Need user_id for this RPC
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            addLog('ERROR', 'Usuário não autenticado. Impossível testar get_aging_report.');
            return;
        }

        const { data, error } = await supabase.rpc('get_aging_report', {
            p_user_id: user.id,
            p_type: 'receivables'
        });

        if (error) {
            addLog('ERROR', 'Falha em get_aging_report', error);
            if (error.code === '42703') {
                addLog('WARN', 'Sugestão: Verifique se houve rename de colunas nas migrations recentes.');
            }
        } else {
            addLog('SUCCESS', `get_aging_report retornou ${Array.isArray(data) ? data.length : 0} registros.`, data);
        }
    };

    const testBancos = async () => {
        addLog('INFO', 'Buscando conta bancária para teste...');

        // Fetch a bank account first to get a valid ID
        const { data: accounts, error: accError } = await supabase
            .from('bank_accounts')
            .select('id, bank_name')
            .limit(1);

        if (accError || !accounts || accounts.length === 0) {
            addLog('WARN', 'Nenhuma conta bancária encontrada para testar get_bank_balance.');
            return;
        }

        const account = accounts[0];
        addLog('INFO', `Usando conta: ${account.bank_name} (${account.id})`);

        addLog('INFO', 'Testando RPC: get_bank_balance...');
        const { data, error } = await supabase.rpc('get_bank_balance', {
            p_bank_account_id: account.id
        });

        if (error) {
            addLog('ERROR', 'Falha em get_bank_balance', error);
        } else {
            addLog('SUCCESS', `get_bank_balance retornou: ${data}`);
        }
    };

    const testTransacoes = async () => {
        addLog('INFO', 'Testando RPC: get_recent_financial_transactions...');
        const { data, error } = await supabase.rpc('get_recent_financial_transactions', {
            p_limit: 5
        });

        if (error) {
            addLog('ERROR', 'Falha em get_recent_financial_transactions', error);
        } else {
            addLog('SUCCESS', `Busca de transações retornou ${Array.isArray(data) ? data.length : 0} itens.`);
        }
    };

    const testConciliacao = async () => {
        addLog('INFO', 'Verificando transações não conciliadas...');
        const { count, error } = await supabase
            .from('financial_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('reconciled', false);

        if (error) {
            addLog('ERROR', 'Erro ao contar não conciliadas', error);
        } else {
            addLog('INFO', `Transações pendentes de conciliação: ${count}`);
        }
    };

    // --- UI Components ---

    const getLevelColor = (level: LogLevel) => {
        switch (level) {
            case 'INFO': return 'text-blue-400';
            case 'WARN': return 'text-yellow-400';
            case 'ERROR': return 'text-red-400 font-bold';
            case 'SUCCESS': return 'text-emerald-400';
            default: return 'text-zinc-400';
        }
    };

    const getLevelIcon = (level: LogLevel) => {
        switch (level) {
            case 'WARN': return <AlertTriangle className="w-3 h-3" />;
            case 'ERROR': return <X className="w-3 h-3" />;
            case 'SUCCESS': return <CheckCircle2 className="w-3 h-3" />;
            default: return <TerminalSquare className="w-3 h-3" />;
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button
                        size="icon"
                        className="h-12 w-12 rounded-full shadow-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all hover:scale-110 group"
                    >
                        <Bug className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                        <span className="sr-only">Debug Mode</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] border-t-zinc-800 bg-zinc-950 text-zinc-100 p-0 flex flex-col">
                    <SheetHeader className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity className="w-5 h-5 text-emerald-500" />
                                <SheetTitle className="text-zinc-100">Protocolo de Sanidade</SheetTitle>
                                <Badge variant="outline" className="text-xs bg-zinc-900/50 border-zinc-700 text-zinc-400">
                                    {context.toUpperCase()}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLogs([])}
                                    disabled={isRunning || logs.length === 0}
                                    className="border-zinc-700 hover:bg-zinc-800 text-zinc-400"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Limpar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={runFullDiagnostic}
                                    disabled={isRunning}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                >
                                    {isRunning ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                                    Rodar Diagnóstico
                                </Button>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-hidden relative bg-black/50 p-6 font-mono text-sm">
                        <ScrollArea className="h-full w-full pr-4" ref={scrollRef}>
                            <div className="space-y-1.5 pb-4">
                                {logs.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-[400px] text-zinc-600 gap-4">
                                        <Bug className="w-16 h-16 opacity-20" />
                                        <p>Aguardando execução do diagnóstico...</p>
                                    </div>
                                )}
                                {logs.map((log) => (
                                    <div key={log.id} className="flex gap-3 group hover:bg-white/5 p-1 rounded -mx-1 px-1 transition-colors">
                                        <span className="text-zinc-600 shrink-0 w-[85px]">
                                            {format(log.timestamp, 'HH:mm:ss.SSS')}
                                        </span>
                                        <span className={cn("font-bold shrink-0 w-[80px] flex items-center gap-1.5", getLevelColor(log.level))}>
                                            {getLevelIcon(log.level)}
                                            {log.level}
                                        </span>
                                        <div className="flex-1 break-words">
                                            <span className="text-zinc-300">{log.message}</span>
                                            {log.details && (
                                                <pre className="mt-2 text-xs bg-zinc-900/80 p-3 rounded border border-zinc-800/50 text-zinc-400 overflow-x-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
