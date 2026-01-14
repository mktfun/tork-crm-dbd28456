
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Task } from '@/types';

interface PaginationConfig {
  page: number;
  pageSize: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface UseSupabaseTasksParams {
  pagination?: PaginationConfig;
  sortConfig?: SortConfig;
}

export function useSupabaseTasks({ pagination, sortConfig }: UseSupabaseTasksParams = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 🚀 **REACT QUERY COM PAGINAÇÃO E ORDENAÇÃO**
  const { data: tasksData, isLoading: loading, error } = useQuery({
    queryKey: ['tasks', user?.id, pagination, sortConfig],
    queryFn: async () => {
      if (!user) return { tasks: [], totalCount: 0 };

      // Construir a query base
      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Aplicar ordenação se configurada
      if (sortConfig?.key) {
        // Mapear keys da UI para colunas do banco
        const columnMap: Record<string, string> = {
          dueDate: 'due_date',
          priority: 'priority',
          status: 'status',
          title: 'title',
          createdAt: 'created_at'
        };
        
        const dbColumn = columnMap[sortConfig.key] || sortConfig.key;
        query = query.order(dbColumn, { ascending: sortConfig.direction === 'asc' });
      } else {
        // Ordenação padrão por data de vencimento
        query = query.order('due_date', { ascending: true });
      }

      // Aplicar paginação se configurada
      if (pagination) {
        const from = (pagination.page - 1) * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }

      const formattedTasks: Task[] = data?.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.due_date,
        priority: task.priority as Task['priority'],
        status: task.status as Task['status'],
        clientId: task.client_id,
        policyId: task.policy_id,
        taskType: task.task_type as Task['taskType'],
        createdAt: task.created_at,
      })) || [];

      return {
        tasks: formattedTasks,
        totalCount: count || 0
      };
    },
    enabled: !!user,
    // 🚀 **OTIMIZAÇÃO DE PERFORMANCE**
    staleTime: 2 * 60 * 1000, // 2 minutos - tarefas não mudam muito
  });

  // 🎯 **MUTATIONS COM INVALIDAÇÃO AUTOMÁTICA**
  const addTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: taskData.title,
          description: taskData.description || null,
          due_date: taskData.dueDate,
          priority: taskData.priority,
          status: 'Pendente',
          client_id: taskData.clientId || null,
          policy_id: taskData.policyId || null,
          task_type: taskData.taskType,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.dueDate) updateData.due_date = updates.dueDate;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.status) updateData.status = updates.status;
      if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
      if (updates.policyId !== undefined) updateData.policy_id = updates.policyId;
      if (updates.taskType) updateData.task_type = updates.taskType;

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    tasks: tasksData?.tasks || [],
    totalCount: tasksData?.totalCount || 0,
    loading,
    error,
    addTask: addTaskMutation.mutateAsync,
    updateTask: (id: string, updates: Partial<Task>) => 
      updateTaskMutation.mutateAsync({ id, updates }),
    deleteTask: deleteTaskMutation.mutateAsync,
    updateTaskStatus: (taskId: string, status: Task['status']) =>
      updateTaskMutation.mutateAsync({ id: taskId, updates: { status } }),
    isAdding: addTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}
