import { Check, Loader2, AlertTriangle, Lightbulb, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useStrategicSummary } from '@/hooks/useStrategicSummary';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type ThinkingStatus = 'thinking' | 'success' | 'warning' | 'info';

export interface ThinkingStep {
    step: string;
    status: ThinkingStatus;
    detail?: string;
}

interface ThinkingCardProps {
    steps: ThinkingStep[];
    isThinking?: boolean;
    className?: string;
    title?: string;
    strategicSummary?: {
        focus?: 'general' | 'finance' | 'crm';
    };
}

const scopeLabels = { day: 'Dia', week: 'Semana', month: 'Mês' } as const;

const getIcon = (status: ThinkingStatus) => {
    switch (status) {
        case 'thinking':
            return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
        case 'success':
            return <Check className="h-4 w-4 text-emerald-500" />;
        case 'warning':
            return <AlertTriangle className="h-4 w-4 text-amber-500" />;
        case 'info':
            return <Lightbulb className="h-4 w-4 text-purple-500" />;
    }
};

export function ThinkingCard({
    steps,
    isThinking = false,
    className,
    title = "Análise da IA",
    strategicSummary,
}: ThinkingCardProps) {
    const focus = strategicSummary?.focus ?? 'general';
    const {
        summary,
        createdAt,
        isCached,
        isLoading: summaryLoading,
        isFetching: summaryFetching,
        scope,
        setScope,
        refresh,
    } = useStrategicSummary(focus);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try { await refresh(); } finally { setIsRefreshing(false); }
    };

    const formattedDate = createdAt
        ? format(parseISO(createdAt), "'Hoje às' HH:mm", { locale: ptBR })
        : 'Aguardando...';

    const showSummary = !!strategicSummary;

    return (
        <Card className={cn("bg-slate-50/50 border-slate-200 shadow-sm", className)}>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {/* Strategic Summary Section */}
                    {showSummary && (
                        <div className="space-y-3 pb-4 border-b border-foreground/10">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                                    <h3 className="font-semibold text-foreground">Resumo Estratégico IA</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted/20"
                                        onClick={handleRefresh}
                                        disabled={isRefreshing || summaryFetching}
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", (isRefreshing || summaryFetching) && "animate-spin")} />
                                    </button>
                                    <div className="flex bg-muted/20 rounded-lg p-0.5">
                                        {(Object.keys(scopeLabels) as Array<keyof typeof scopeLabels>).map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => setScope(key)}
                                                className={cn(
                                                    "px-2.5 py-1 text-xs rounded-md transition-all duration-150",
                                                    scope === key
                                                        ? "bg-primary/20 text-primary font-medium"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {scopeLabels[key]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm text-foreground/80 leading-relaxed min-h-[32px]">
                                {summaryLoading ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Analisando dados do sistema...
                                    </div>
                                ) : summary ? (
                                    <p>{summary}</p>
                                ) : (
                                    <p className="text-muted-foreground">Sem dados suficientes para análise.</p>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {isCached ? `Cache • Atualizado: ${formattedDate}` : `Atualizado: ${formattedDate}`}
                            </div>
                        </div>
                    )}

                    {/* Thinking Steps Header */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            {isThinking ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Processando Raciocínio...
                                </>
                            ) : (
                                <>
                                    <Lightbulb className="h-3 w-3" />
                                    {title}
                                </>
                            )}
                        </h3>
                        {isThinking && <span className="text-[10px] text-slate-400 font-mono">GEMINI-FLASH-THINKING</span>}
                    </div>

                    {/* Thinking Steps */}
                    <div className="space-y-3">
                        {steps.map((step, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 text-sm animate-in fade-in slide-in-from-left-2 duration-300 fill-mode-forwards opacity-0"
                                style={{ animationDelay: `${idx * 150}ms` }}
                            >
                                <div className="mt-0.5 shrink-0 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                                    {getIcon(step.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className={cn(
                                        "font-medium block",
                                        step.status === 'thinking' ? "text-blue-600" : "text-slate-700"
                                    )}>
                                        {step.step}
                                    </span>
                                    {step.detail && (
                                        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                                            {step.detail}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isThinking && (
                            <div className="flex items-center gap-3 pl-1 pt-1 opacity-50">
                                <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
                                <div className="h-2 w-24 rounded-full bg-slate-300 animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
