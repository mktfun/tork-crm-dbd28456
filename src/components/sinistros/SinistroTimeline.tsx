import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  User,
  Plus,
  MessageSquare,
  Calendar,
  DollarSign,
  Edit,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Activity {
  id: string;
  sinistro_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  old_values?: any;
  new_values?: any;
  created_at: string;
}

interface SinistroTimelineProps {
  sinistroId: string;
  currentStatus: string;
  activities: Activity[];
  onRefresh?: () => void;
}

const statusOptions = [
  'Aberto',
  'Em Análise',
  'Documentação Pendente',
  'Aprovado',
  'Negado',
  'Cancelado',
  'Finalizado'
];

const activityTypes = [
  'Comentário',
  'Mudança de Status',
  'Anexo Adicionado',
  'Atribuição',
  'Aprovação',
  'Negativa',
  'Pagamento',
  'Atualização'
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'Criação':
      return <Plus className="w-4 h-4 text-blue-400" />;
    case 'Mudança de Status':
      return <Edit className="w-4 h-4 text-yellow-400" />;
    case 'Comentário':
      return <MessageSquare className="w-4 h-4 text-purple-400" />;
    case 'Anexo Adicionado':
      return <FileText className="w-4 h-4 text-green-400" />;
    case 'Atribuição':
      return <User className="w-4 h-4 text-orange-400" />;
    case 'Aprovação':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'Negativa':
      return <XCircle className="w-4 h-4 text-red-400" />;
    case 'Pagamento':
      return <DollarSign className="w-4 h-4 text-green-500" />;
    case 'Atualização':
      return <Edit className="w-4 h-4 text-blue-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Aberto':
      return 'bg-blue-500';
    case 'Em Análise':
      return 'bg-yellow-500';
    case 'Aprovado':
      return 'bg-green-500';
    case 'Negado':
      return 'bg-red-500';
    case 'Finalizado':
      return 'bg-gray-500';
    case 'Cancelado':
      return 'bg-orange-500';
    case 'Documentação Pendente':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

export function SinistroTimeline({ sinistroId, currentStatus, activities, onRefresh }: SinistroTimelineProps) {
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityType, setActivityType] = useState('');
  const [description, setDescription] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR });
  };

  const handleAddActivity = async () => {
    if (!user?.id || !activityType || !description.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const activityData = {
        sinistro_id: sinistroId,
        user_id: user.id,
        activity_type: activityType,
        description: description.trim(),
      };

      // If it's a status change, also update the sinistro status
      if (activityType === 'Mudança de Status' && newStatus && newStatus !== currentStatus) {
        // Update sinistro status
        const { error: updateError } = await supabase
          .from('sinistros')
          .update({ status: newStatus })
          .eq('id', sinistroId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Add old and new values to activity
        activityData.description = `Status alterado de "${currentStatus}" para "${newStatus}"`;
      }

      // Insert activity
      const { error: activityError } = await supabase
        .from('sinistro_activities')
        .insert(activityData);

      if (activityError) throw activityError;

      toast.success('Atividade adicionada com sucesso!');
      
      // Reset form
      setActivityType('');
      setDescription('');
      setNewStatus('');
      setIsAddingActivity(false);
      
      // Refresh data
      onRefresh?.();

    } catch (error) {
      console.error('Erro ao adicionar atividade:', error);
      toast.error('Erro ao adicionar atividade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickStatusChange = async (status: string) => {
    if (!user?.id || status === currentStatus) return;

    setIsSubmitting(true);

    try {
      // Update sinistro status
      const { error: updateError } = await supabase
        .from('sinistros')
        .update({ status })
        .eq('id', sinistroId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Add activity record
      const { error: activityError } = await supabase
        .from('sinistro_activities')
        .insert({
          sinistro_id: sinistroId,
          user_id: user.id,
          activity_type: 'Mudança de Status',
          description: `Status alterado de "${currentStatus}" para "${status}"`,
        });

      if (activityError) throw activityError;

      toast.success(`Status alterado para "${status}"`);
      onRefresh?.();

    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-white/5 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Ações Rápidas</h4>
        <div className="flex flex-wrap gap-2">
          {statusOptions
            .filter(status => status !== currentStatus)
            .map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => quickStatusChange(status)}
                disabled={isSubmitting}
                className={`${getStatusColor(status)} border-none text-white hover:opacity-80`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                {status}
              </Button>
            ))}
        </div>
      </div>

      {/* Add Activity Form */}
      <div className="bg-white/5 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-medium">Adicionar Atividade</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingActivity(!isAddingActivity)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {isAddingActivity ? 'Cancelar' : 'Nova Atividade'}
          </Button>
        </div>

        {isAddingActivity && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de atividade" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activityType === 'Mudança de Status' && (
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Novo status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions
                      .filter(status => status !== currentStatus)
                      .map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Textarea
              placeholder="Descrição da atividade ou comentário..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddingActivity(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddActivity}
                disabled={isSubmitting || !activityType || !description.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <h4 className="text-white font-medium">Histórico de Atividades</h4>
        
        {activities.length === 0 ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Nenhuma atividade registrada ainda.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative">
                {/* Timeline Line */}
                {index < activities.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-white/10" />
                )}
                
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {activity.activity_type}
                        </Badge>
                        <span className="text-xs text-white/60">
                          {formatDateTime(activity.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-white/80 text-sm mb-2">
                      {activity.description}
                    </p>

                    {/* Show old/new values for status changes */}
                    {activity.old_values && activity.new_values && (
                      <div className="grid grid-cols-2 gap-4 text-xs bg-white/5 rounded p-2">
                        <div>
                          <span className="text-white/60">Anterior:</span>
                          <p className="text-red-400">
                            {JSON.stringify(activity.old_values)}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/60">Novo:</span>
                          <p className="text-green-400">
                            {JSON.stringify(activity.new_values)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
