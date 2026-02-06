import { Check, Loader2, AlertTriangle, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
}

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
    title = "Análise da IA"
}: ThinkingCardProps) {
    return (
        <Card className={cn("bg-slate-50/50 border-slate-200 shadow-sm", className)}>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {/* Título Dinâmico */}
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

                    {/* Lista de Passos do Pensamento */}
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

                        {/* Loading Skeleton para indicar que mais passos virão se estiver pensando */}
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
