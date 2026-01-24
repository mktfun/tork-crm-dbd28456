import React, { useState } from 'react';
import { Bot, Building2, MessageCircle, BookOpen, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/ui/stepper';
import { cn } from '@/lib/utils';
import { useGlobalAiConfig, VoiceTone } from '@/hooks/useGlobalAiConfig';

interface VoiceToneOption {
  value: VoiceTone;
  label: string;
  description: string;
  icon: React.ReactNode;
  emoji: string;
}

const voiceToneOptions: VoiceToneOption[] = [
  {
    value: 'technical',
    label: 'Técnico',
    description: 'Respostas detalhadas com foco em especificações e dados técnicos do seguro.',
    icon: <BookOpen className="h-6 w-6" />,
    emoji: '🔬'
  },
  {
    value: 'friendly',
    label: 'Amigável',
    description: 'Tom acolhedor e empático, perfeito para construir relacionamentos.',
    icon: <MessageCircle className="h-6 w-6" />,
    emoji: '😊'
  },
  {
    value: 'honest',
    label: 'Direto ao Ponto',
    description: 'Comunicação objetiva e transparente, sem rodeios.',
    icon: <Sparkles className="h-6 w-6" />,
    emoji: '💪'
  }
];

const STEPS = ['Identidade', 'Vibe', 'Base de Conhecimento'];

export function AIOnboardingWizard() {
  const { completeOnboarding } = useGlobalAiConfig();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form state
  const [agentName, setAgentName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [voiceTone, setVoiceTone] = useState<VoiceTone>('friendly');
  const [baseInstructions, setBaseInstructions] = useState('');

  const canProceedStep1 = agentName.trim().length >= 2;
  const canProceedStep2 = true; // Voice tone always has a default
  const canProceedStep3 = true; // Instructions are optional

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
    await completeOnboarding.mutateAsync({
      agent_name: agentName.trim(),
      company_name: companyName.trim() || undefined,
      voice_tone: voiceTone,
      base_instructions: baseInstructions.trim()
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-4">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Configure seu Agente de IA
          </h1>
          <p className="text-muted-foreground">
            Vamos criar a personalidade do seu assistente virtual
          </p>
        </div>

        {/* Stepper */}
        <Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />

        {/* Content Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Como seu agente deve se apresentar?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Escolha um nome que represente a personalidade do seu assistente
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agentName" className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    Nome do Agente *
                  </Label>
                  <Input
                    id="agentName"
                    placeholder="Ex: Assistente Tork, Ana, João..."
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Nome da Empresa (opcional)
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Ex: Corretora ABC, Seguros XYZ..."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    O agente poderá mencionar sua empresa nas conversas
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Voice Tone */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Qual é a vibe do seu agente?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Escolha o tom de voz que combina com sua marca
                </p>
              </div>

              <div className="grid gap-4">
                {voiceToneOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setVoiceTone(option.value)}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200",
                      voiceTone === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border/50 bg-background/30 hover:border-primary/30 hover:bg-background/50"
                    )}
                  >
                    <span className="text-3xl">{option.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium text-foreground mb-1">
                        {option.label}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      voiceTone === option.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}>
                      {voiceTone === option.value && (
                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
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
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Base de Conhecimento
                </h2>
                <p className="text-sm text-muted-foreground">
                  Instruções gerais que o agente deve seguir em todas as conversas
                </p>
              </div>

              <div className="space-y-4">
                <Textarea
                  placeholder="Ex: Sempre cumprimente o cliente pelo nome. Nunca forneça valores de proposta sem antes verificar o perfil completo. Ao final de cada conversa, pergunte se pode ajudar com algo mais..."
                  value={baseInstructions}
                  onChange={(e) => setBaseInstructions(e.target.value)}
                  className="min-h-[200px] bg-background/50 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Estas instruções serão aplicadas em todas as etapas do funil. 
                  Você poderá personalizar cada etapa depois.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={currentStep === 1 && !canProceedStep1}
                className="gap-2"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={completeOnboarding.isPending}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              >
                {completeOnboarding.isPending ? 'Salvando...' : 'Concluir Configuração'}
                <Sparkles className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
