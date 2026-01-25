import React from 'react';
import { Rocket, Shield, Heart, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_PERSONA_PRESETS } from './aiPresets';

export type VibeId = 'proactive' | 'technical' | 'supportive';

interface VibeSelectorProps {
  value: VibeId | null;
  onChange: (vibeId: VibeId) => void;
  disabled?: boolean;
}

const VIBE_CONFIG: Record<VibeId, {
  id: VibeId;
  name: string;
  shortName: string;
  icon: React.ReactNode;
  description: string;
  style: string;
  activeStyle: string;
}> = {
  proactive: {
    id: 'proactive',
    name: 'O Vendedor',
    shortName: 'Vendedor',
    icon: <Rocket className="h-5 w-5" />,
    description: 'Direto, ping-pong, fecha rápido',
    style: 'Sem pontuação, foco em CNPJ',
    activeStyle: 'border-emerald-500/50 bg-emerald-500/10',
  },
  technical: {
    id: 'technical',
    name: 'O Técnico',
    shortName: 'Técnico',
    icon: <Shield className="h-5 w-5" />,
    description: 'Autoridade, diagnóstico, precisão',
    style: 'Especialista mas humano',
    activeStyle: 'border-blue-500/50 bg-blue-500/10',
  },
  supportive: {
    id: 'supportive',
    name: 'O Amigo',
    shortName: 'Amigo',
    icon: <Heart className="h-5 w-5" />,
    description: 'Calmo, resolutivo, acolhedor',
    style: 'Suporte VIP, sem burocracia',
    activeStyle: 'border-amber-500/50 bg-amber-500/10',
  },
};

export function getVibePreset(vibeId: VibeId) {
  return AI_PERSONA_PRESETS.find(p => p.id === vibeId);
}

export function VibeSelector({ value, onChange, disabled }: VibeSelectorProps) {
  const vibes = Object.values(VIBE_CONFIG);

  return (
    <div className="grid grid-cols-3 gap-2">
      {vibes.map((vibe) => {
        const isActive = value === vibe.id;
        
        return (
          <button
            key={vibe.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(vibe.id)}
            className={cn(
              'relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200',
              'hover:scale-[1.02] active:scale-[0.98]',
              disabled && 'opacity-50 cursor-not-allowed',
              isActive
                ? vibe.activeStyle
                : 'border-border bg-secondary/30 hover:border-muted-foreground/30'
            )}
          >
            {isActive && (
              <div className="absolute top-1.5 right-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            )}
            
            <div className={cn(
              'p-2 rounded-lg transition-colors',
              isActive ? 'bg-background/50' : 'bg-secondary/50'
            )}>
              {vibe.icon}
            </div>
            
            <div className="text-center">
              <p className={cn(
                'text-sm font-medium',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {vibe.shortName}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {vibe.style}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { VIBE_CONFIG };
