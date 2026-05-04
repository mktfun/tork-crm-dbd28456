import React from 'react';
import { useProposalEvents } from '@/hooks/useProposals';
import { Proposal } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, MousePointerClick, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProposalAnalyticsDashboardProps {
  proposal: Proposal;
}

export function ProposalAnalyticsDashboard({ proposal }: ProposalAnalyticsDashboardProps) {
  const { data: events = [], isLoading } = useProposalEvents(proposal.id);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'view_started': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'option_selected': return <MousePointerClick className="w-4 h-4 text-purple-500" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEventText = (event: any) => {
    switch (event.event_type) {
      case 'view_started': return 'Cliente abriu a proposta';
      case 'view_ended': return 'Cliente fechou a proposta';
      case 'option_selected': return `Clicou na opção ${event.metadata?.option_id || ''}`;
      case 'accepted': return 'Proposta Aceita!';
      case 'rejected': return 'Proposta Recusada';
      default: return 'Evento desconhecido';
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase">Visualizações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposal.total_views}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase">Tempo Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(proposal.total_time_seconds / 60)} min</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase">Temperatura</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={
              proposal.warmth === 'hot' ? 'destructive' : 
              proposal.warmth === 'warm' ? 'default' : 'secondary'
            }>
              {proposal.warmth.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="capitalize">{proposal.status}</Badge>
          </CardContent>
        </Card>
      </div>

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Timeline de Interações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {events.map((event, index) => (
                <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {getEventIcon(event.event_type)}
                  </div>
                  
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border border-border p-4 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-medium text-sm text-foreground">{getEventText(event)}</div>
                      <time className="text-xs text-muted-foreground font-mono">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                      </time>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
