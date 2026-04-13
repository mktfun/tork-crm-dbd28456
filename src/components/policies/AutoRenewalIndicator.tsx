
import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { differenceInDays } from 'date-fns';

interface AutoRenewalIndicatorProps {
  automaticRenewal: boolean;
  expirationDate: string;
  status: 'Orçamento' | 'Aguardando Apólice' | 'Ativa' | 'Cancelada' | 'Renovada';
  size?: 'sm' | 'md';
}

export function AutoRenewalIndicator({ 
  automaticRenewal, 
  expirationDate,
  status,
}: AutoRenewalIndicatorProps) {
  const daysUntilExpiration = differenceInDays(new Date(expirationDate), new Date());

  if (!automaticRenewal || status !== 'Ativa') return null;
  if (daysUntilExpiration > 90) return null;

  if (daysUntilExpiration < 0) {
    return (
      <Badge className="bg-destructive/10 text-destructive border border-destructive/30 text-xs gap-1">
        <RotateCcw className="w-3 h-3" />
        Renovação vencida
      </Badge>
    );
  }

  return (
    <Badge className="bg-primary/10 text-primary border border-primary/30 text-xs gap-1">
      <RotateCcw className="w-3 h-3" />
      Renovar em {daysUntilExpiration}d
    </Badge>
  );
}
