import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PolicyRenewalSectionProps {
  policyId: string;
  automaticRenewal: boolean;
  expirationDate: string;
}

export function PolicyRenewalSection({ 
  policyId, 
  automaticRenewal, 
  expirationDate 
}: PolicyRenewalSectionProps) {
  const { data: renewalAppointments, isLoading } = useQuery({
    queryKey: ['renewal-appointments', policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clientes(name)
        `)
        .eq('policy_id', policyId)
        .ilike('title', 'Renovação%')
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: automaticRenewal
  });

  if (!automaticRenewal) return null;

  const renewalDate = new Date(expirationDate);
  renewalDate.setDate(renewalDate.getDate() - 15);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-green-400 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Renovação Automática Habilitada
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <AlertCircle className="w-4 h-4 text-orange-400" />
          <span>
            Agendamento será criado automaticamente em{' '}
            <strong className="text-orange-400">
              {renewalDate.toLocaleDateString('pt-BR')}
            </strong>
            {' '}(15 dias antes do vencimento)
          </span>
        </div>

        {isLoading ? (
          <div className="animate-pulse bg-slate-700 h-16 rounded"></div>
        ) : renewalAppointments && renewalAppointments.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-200">
              Agendamentos de Renovação:
            </h4>
            {renewalAppointments.map((appointment: any) => (
              <div 
                key={appointment.id} 
                className="bg-slate-700 p-3 rounded-lg border-l-4 border-green-500"
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-slate-100">
                    {appointment.title}
                  </h5>
                  <Badge 
                    variant={appointment.status === 'Pendente' ? 'secondary' : 'default'}
                  >
                    {appointment.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(appointment.date).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {appointment.time ? String(appointment.time).slice(0,5) : new Date(appointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {appointment.client?.name || 'Cliente não encontrado'}
                  </div>
                </div>
                
                {(() => {
                  const note = (appointment.notes || '').trim();
                  const hide = note.toLowerCase().startsWith('agendamento automático para renovação');
                  return !hide && note ? (
                    <p className="text-xs text-slate-400 mt-2 italic">{note}</p>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 italic">
            Nenhum agendamento de renovação criado ainda.
            {renewalDate > new Date() && (
              <span className="block mt-1">
                O agendamento será criado automaticamente quando a data chegar.
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
