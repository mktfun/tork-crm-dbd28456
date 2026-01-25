import React, { useState } from 'react';
import { Bot, Building2, FileText, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/ui/stepper';
import { cn } from '@/lib/utils';
import { useGlobalAiConfig, VoiceTone } from '@/hooks/useGlobalAiConfig';
import { AI_PERSONA_PRESETS, AIPreset, DYNAMIC_VARIABLES } from './aiPresets';

const STEPS = ['Identidade', 'Vibe', 'Instruções Base'];

// Map preset IDs to the 3 required presets
const ONBOARDING_PRESETS = AI_PERSONA_PRESETS.filter(p => 
  ['technical', 'proactive', 'supportive'].includes(p.id)
);

export function AIOnboardingWizard() {
  const { completeOnboarding } = useGlobalAiConfig();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state
  const [agentName, setAgentName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [baseInstructions, setBaseInstructions] = useState('');

  const canProceedStep1 = agentName.trim().length >= 2;

  const handlePresetSelect = (preset: AIPreset) => {
    setSelectedPreset(preset.id);
    // Auto-fill base instructions with XML-structured prompt
    setBaseInstructions(preset.xmlPrompt);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    const preset = ONBOARDING_PRESETS.find(p => p.id === selectedPreset);
    await completeOnboarding.mutateAsync({
      agent_name: agentName.trim(),
      company_name: companyName.trim() || undefined,
      voice_tone: preset?.tone || 'friendly',
      base_instructions: baseInstructions.trim()
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 mb-4">
            <Bot className="h-6 w-6 text-zinc-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 mb-2">
            Configure seu Agente de IA
          </h1>
          <p className="text-zinc-400">
            Vamos criar a personalidade do seu assistente virtual
          </p>
        </div>

        {/* Stepper */}
        <Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />

        {/* Content Card */}
        <div className="bg-zinc-950/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6 sm:p-8">
          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                  Como seu agente deve se apresentar?
                </h2>
                <p className="text-sm text-zinc-400">
                  Escolha um nome que represente a personalidade do seu assistente
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agentName" className="flex items-center gap-2 text-zinc-400">
                    <Bot className="h-4 w-4 text-zinc-500" />
                    Nome do Agente *
                  </Label>
                  <Input
                    id="agentName"
                    placeholder="Ex: Assistente Tork, Ana, João..."
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="flex items-center gap-2 text-zinc-400">
                    <Building2 className="h-4 w-4 text-zinc-500" />
                    Nome da Empresa (opcional)
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Ex: Corretora ABC, Seguros XYZ..."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                  />
                  <p className="text-xs text-zinc-500">
                    O agente poderá mencionar sua empresa nas conversas
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Vibe - Preset Selection */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                  Qual é a vibe do seu agente?
                </h2>
                <p className="text-sm text-zinc-400">
                  Escolha um perfil base - você poderá personalizar depois
                </p>
              </div>

              <div className="grid gap-3">
                {ONBOARDING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200",
                      selectedPreset === preset.id
                        ? "border-zinc-600 bg-zinc-900"
                        : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-100 mb-1">
                        {preset.name}
                      </div>
                      <p className="text-sm text-zinc-400">
                        {preset.description}
                      </p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      selectedPreset === preset.id
                        ? "border-zinc-400 bg-zinc-600"
                        : "border-zinc-700"
                    )}>
                      {selectedPreset === preset.id && (
                        <Check className="w-3 h-3 text-zinc-100" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Base Instructions */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                  Prompt Estruturado (XML)
                </h2>
                <p className="text-sm text-zinc-400">
                  Revise e personalize as instruções do seu agente
                </p>
              </div>

              {/* XML Tags Reference */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                <p className="text-xs font-medium text-zinc-400 mb-2">Referência de Tags XML:</p>
                <div className="grid grid-cols-1 gap-1 text-xs font-mono">
                  <div className="flex gap-2">
                    <span className="text-emerald-400">&lt;identity&gt;</span>
                    <span className="text-zinc-500">Quem é o agente e sua atitude</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400">&lt;flow_control&gt;</span>
                    <span className="text-zinc-500">Como conduzir a conversa</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400">&lt;business_logic&gt;</span>
                    <span className="text-zinc-500">Regras de negócio específicas</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400">&lt;reasoning_engine&gt;</span>
                    <span className="text-zinc-500">Ordem de raciocínio (opcional)</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400">&lt;output_formatting&gt;</span>
                    <span className="text-zinc-500">Formato e proibições de saída</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Textarea
                  placeholder="<identity>Descreva quem é o agente...</identity>"
                  value={baseInstructions}
                  onChange={(e) => setBaseInstructions(e.target.value)}
                  className="min-h-[280px] bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none font-mono text-sm leading-relaxed"
                />
                <p className="text-xs text-zinc-500">
                  Variáveis disponíveis:{' '}
                  {DYNAMIC_VARIABLES.map((v, i) => (
                    <span key={v.variable}>
                      <span className="text-emerald-400 font-mono">{v.variable}</span>
                      {i < DYNAMIC_VARIABLES.length - 1 && ', '}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={currentStep === 1 && !canProceedStep1}
                className="gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={completeOnboarding.isPending}
                className="gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
              >
                {completeOnboarding.isPending ? 'Salvando...' : 'Concluir Configuração'}
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
