import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, GitBranch, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfigSource = 'stage' | 'pipeline' | 'global' | 'default';

interface ConfigSourceBadgeProps {
  source: ConfigSource;
  size?: 'sm' | 'md';
  className?: string;
}

const CONFIG_SOURCE_INFO: Record<ConfigSource, {
  label: string;
  icon: React.ElementType;
  className: string;
  description: string;
}> = {
  stage: {
    label: 'Customizado',
    icon: Sparkles,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Esta etapa tem DNA próprio',
  },
  pipeline: {
    label: 'Padrão do Funil',
    icon: GitBranch,
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    description: 'Usando DNA padrão do funil',
  },
  global: {
    label: 'Global',
    icon: Globe,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description: 'Usando configuração global',
  },
  default: {
    label: 'Padrão',
    icon: Globe,
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    description: 'Usando valores padrão do sistema',
  },
};

export function ConfigSourceBadge({ source, size = 'md', className }: ConfigSourceBadgeProps) {
  const info = CONFIG_SOURCE_INFO[source];
  const Icon = info.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "border font-medium",
        info.className,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      <Icon className={cn("mr-1", size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      {info.label}
    </Badge>
  );
}

export function getConfigSourceDescription(source: ConfigSource): string {
  return CONFIG_SOURCE_INFO[source].description;
}

/**
 * Determines the config source based on whether stage has custom settings
 * and whether pipeline has defaults configured.
 */
export function determineConfigSource(
  hasStageConfig: boolean,
  hasPipelineDefault: boolean,
  hasGlobalConfig: boolean
): ConfigSource {
  if (hasStageConfig) return 'stage';
  if (hasPipelineDefault) return 'pipeline';
  if (hasGlobalConfig) return 'global';
  return 'default';
}
