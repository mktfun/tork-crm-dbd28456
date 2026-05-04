import React, { useState } from 'react';
import { QuoteUploadButton } from '@/components/policies/QuoteUploadButton';
import { ProposalOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Sparkles } from 'lucide-react';

interface ProposalPDFImporterProps {
  onImportComplete: (options: Partial<ProposalOption>[], clientName?: string) => void;
}

export function ProposalPDFImporter({ onImportComplete }: ProposalPDFImporterProps) {
  const [extractedOptions, setExtractedOptions] = useState<Partial<ProposalOption>[]>([]);
  const [clientName, setClientName] = useState<string>('');

  const handleDataExtracted = (data: any) => {
    if (data && data.options) {
      setExtractedOptions(data.options);
    }
    if (data && data.client_name) {
      setClientName(data.client_name);
    }
  };

  const addManualOption = () => {
    if (extractedOptions.length >= 3) return;
    setExtractedOptions([
      ...extractedOptions,
      {
        insurer_name: '',
        plan_name: '',
        price_monthly: undefined,
        price_annual: undefined,
        deductible: '',
        coverage_items: [],
        is_recommended: extractedOptions.length === 0,
      }
    ]);
  };

  const removeOption = (index: number) => {
    const newOpts = [...extractedOptions];
    newOpts.splice(index, 1);
    setExtractedOptions(newOpts);
  };

  const updateOption = (index: number, field: keyof ProposalOption, value: any) => {
    const newOpts = [...extractedOptions];
    newOpts[index] = { ...newOpts[index], [field]: value };
    setExtractedOptions(newOpts);
  };

  const handleFinish = () => {
    onImportComplete(extractedOptions, clientName);
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 border border-border p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Importar Orçamento em PDF</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            Faça upload do PDF gerado pela corretora. Nossa IA (ou extrator local) irá preencher as opções automaticamente.
          </p>
        </div>
        <div className="w-full max-w-xs mt-2">
          <QuoteUploadButton onDataExtracted={handleDataExtracted} />
        </div>
      </div>

      {extractedOptions.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Opções Extraídas ({extractedOptions.length}/3)</h4>
            {extractedOptions.length < 3 && (
              <Button variant="outline" size="sm" onClick={addManualOption}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Manual
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {extractedOptions.map((opt, idx) => (
              <div key={idx} className="bg-card border border-border p-4 rounded-xl space-y-4 relative group">
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeOption(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Seguradora</Label>
                  <Input 
                    value={opt.insurer_name || ''} 
                    onChange={(e) => updateOption(idx, 'insurer_name', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Plano</Label>
                  <Input 
                    value={opt.plan_name || ''} 
                    onChange={(e) => updateOption(idx, 'plan_name', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor Mensal</Label>
                    <Input 
                      type="number"
                      value={opt.price_monthly || ''} 
                      onChange={(e) => updateOption(idx, 'price_monthly', parseFloat(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor Anual</Label>
                    <Input 
                      type="number"
                      value={opt.price_annual || ''} 
                      onChange={(e) => updateOption(idx, 'price_annual', parseFloat(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Franquia</Label>
                  <Input 
                    value={opt.deductible || ''} 
                    onChange={(e) => updateOption(idx, 'deductible', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleFinish} className="w-full sm:w-auto">
              Confirmar e Avançar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
