import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseNotifications } from '@/hooks/useSupabaseNotifications';
import { useToast } from '@/hooks/use-toast';
export function TesteNotificacoes() {
  const [message, setMessage] = useState('');
  const {
    notifications,
    unreadCount
  } = useSupabaseNotifications();
  const {
    toast
  } = useToast();
  const createTestNotification = async () => {
    if (!message.trim()) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const {
        error
      } = await supabase.from('notifications').insert({
        user_id: user.id,
        message: message.trim()
      });
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Notificação de teste criada!"
      });
      setMessage('');
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar notificação de teste",
        variant: "destructive"
      });
    }
  };
  return;
}