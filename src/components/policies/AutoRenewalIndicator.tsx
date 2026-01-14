
import React from 'react';
import { RotateCcw, Calendar, Check, AlertTriangle } from 'lucide-react';
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
  size = 'sm' 
}: AutoRenewalIndicatorProps) {
  const today = new Date();
  const expDate = new Date(expirationDate);
  const daysUntilExpiration = differenceInDays(expDate, today);
  
  if (!automaticRenewal) return null;

  const isOverdue = daysUntilExpiration < 0;
  const isNearExpiration = daysUntilExpiration <= 90 && daysUntilExpiration > 0;

  // Seção de status de agendamento de renovação
  const renderRenewalScheduleStatus = () => {
    if (status !== 'Ativa' || !automaticRenewal) {
      return null;
    }

    const scheduledDate = new Date(expirationDate);
    scheduledDate.setDate(scheduledDate.getDate() - 15);
    
    const isScheduleActive = daysUntilExpiration <= 90 && daysUntilExpiration > 0;

    if (isOverdue) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Vencida - Renovação pendente</span>
        </div>
      );
    }

    if (!isScheduleActive) {
      return null;
    }

    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1 text-blue-600 border-blue-300">
          <Calendar className="w-3 h-3" />
          Renovação agendada
        </Badge>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {scheduledDate.toLocaleDateString('pt-BR')}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge 
          variant={isOverdue ? "destructive" : isNearExpiration ? "default" : "secondary"} 
          className={`${size === 'md' ? 'px-3 py-1' : 'px-2 py-0.5'} flex items-center gap-1`}
        >
          <RotateCcw className="w-3 h-3" />
          Renovação Automática
        </Badge>
        
        {isOverdue && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Vencida ({Math.abs(daysUntilExpiration)} dias)
          </Badge>
        )}
        
        {isNearExpiration && (
          <Badge variant="outline" className="flex items-center gap-1 text-orange-600 border-orange-300">
            <Calendar className="w-3 h-3" />
            Vence em {daysUntilExpiration} dias
          </Badge>
        )}
      </div>
      
      {renderRenewalScheduleStatus()}
    </div>
  );
}
