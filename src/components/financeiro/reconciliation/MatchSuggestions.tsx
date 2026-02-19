import { useState } from 'react';
import { X, Sparkles, CheckCircle2, XCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/utils/formatCurrency';
import { type MatchSuggestion, useApplyMatchSuggestions } from '@/hooks/useReconciliation';

interface MatchSuggestionsProps {
    suggestions: MatchSuggestion[];
    onClose: () => void;
    onApplied: () => void;
}

export function MatchSuggestions({ suggestions, onClose, onApplied }: MatchSuggestionsProps) {
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(
        new Set(suggestions.map((_, idx) => idx))
    );

    const applyMutation = useApplyMatchSuggestions();

    const toggleSuggestion = (idx: number) => {
        setSelectedSuggestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idx)) {
                newSet.delete(idx);
            } else {
                newSet.add(idx);
            }
            return newSet;
        });
    };

    const toggleAll = () => {
        if (selectedSuggestions.size === suggestions.length) {
            setSelectedSuggestions(new Set());
        } else {
            setSelectedSuggestions(new Set(suggestions.map((_, idx) => idx)));
        }
    };

    const handleApply = async () => {
        const toApply = suggestions.filter((_, idx) => selectedSuggestions.has(idx));
        await applyMutation.mutateAsync(toApply);
        onApplied();
    };

    const getConfidenceBadge = (confidence: number) => {
        if (confidence >= 0.9) {
            return <Badge className="bg-emerald-500/20 text-emerald-400">{Math.round(confidence * 100)}%</Badge>;
        } else if (confidence >= 0.7) {
            return <Badge className="bg-amber-500/20 text-amber-400">{Math.round(confidence * 100)}%</Badge>;
        } else {
            return <Badge className="bg-red-500/20 text-red-400">{Math.round(confidence * 100)}%</Badge>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <AppCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-semibold">Sugestões de Conciliação Automática</h3>
                        <Badge variant="secondary">{suggestions.length} sugestões</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-auto">
                    {/* Selecionar Todos */}
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                        <Checkbox
                            checked={selectedSuggestions.size === suggestions.length}
                            onCheckedChange={toggleAll}
                        />
                        <span className="text-sm font-medium">
                            Selecionar todas ({selectedSuggestions.size} de {suggestions.length})
                        </span>
                    </div>

                    {/* Lista de Sugestões */}
                    <div className="space-y-3">
                        {suggestions.map((suggestion, idx) => (
                            <AppCard
                                key={idx}
                                className={`p-4 cursor-pointer transition-all ${selectedSuggestions.has(idx)
                                        ? 'ring-2 ring-primary bg-primary/5'
                                        : 'hover:bg-muted/50'
                                    }`}
                                onClick={() => toggleSuggestion(idx)}
                            >
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        checked={selectedSuggestions.has(idx)}
                                        onCheckedChange={() => toggleSuggestion(idx)}
                                        className="mt-1"
                                    />

                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                        {/* Extrato */}
                                        <div className="bg-muted/50 p-3 rounded">
                                            <p className="text-xs text-muted-foreground mb-1">Extrato Bancário</p>
                                            <p className="text-sm font-medium truncate">{suggestion.statement_description}</p>
                                            <p className={`font-semibold ${suggestion.statement_amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {formatCurrency(suggestion.statement_amount)}
                                            </p>
                                        </div>

                                        {/* Arrow */}
                                        <div className="hidden md:flex justify-center">
                                            <ArrowRight className="w-6 h-6 text-muted-foreground" />
                                        </div>

                                        {/* Sistema */}
                                        <div className="bg-muted/50 p-3 rounded">
                                            <p className="text-xs text-muted-foreground mb-1">Sistema</p>
                                            <p className="text-sm font-medium truncate">{suggestion.system_description}</p>
                                            <p className={`font-semibold ${suggestion.system_amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {formatCurrency(suggestion.system_amount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Confiança + Parcial */}
                                    <div className="text-right space-y-1">
                                        {getConfidenceBadge(suggestion.confidence)}
                                        {Math.abs(suggestion.statement_amount) !== Math.abs(suggestion.system_amount) && (
                                            <Badge className="bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Parcial
                                            </Badge>
                                        )}
                                        {suggestion.date_diff > 0 && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {suggestion.date_diff} dia{suggestion.date_diff > 1 ? 's' : ''} de diferença
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </AppCard>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                        {selectedSuggestions.size} sugestões selecionadas
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={selectedSuggestions.size === 0 || applyMutation.isPending}
                            className="gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {applyMutation.isPending
                                ? 'Aplicando...'
                                : `Aplicar ${selectedSuggestions.size} Sugestões`
                            }
                        </Button>
                    </div>
                </div>
            </AppCard>
        </div>
    );
}
