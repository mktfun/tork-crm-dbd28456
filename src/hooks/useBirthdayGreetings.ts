
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

interface BirthdayClient {
  clientId: string;
  clientName: string;
  clientPhone: string;
  processedMessage: string;
  age: number;
}

export function useBirthdayGreetings() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age + 1; // +1 porque está completando anos hoje
  };

  const processMessage = (template: string, clientName: string, age: number) => {
    const defaultTemplate = "🎉 Parabéns, [NOME]! Desejamos que seus [IDADE] anos sejam repletos de alegria, saúde e realizações! 🎂✨";
    const messageTemplate = template || defaultTemplate;
    
    return messageTemplate
      .replace(/\[NOME\]/g, clientName)
      .replace(/\[IDADE\]/g, age.toString());
  };

  const markGreetingAsSent = async (clientId: string) => {
    if (!user) return { error: 'Usuário não encontrado' };

    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();

      const { error } = await supabase
        .from('birthday_greetings')
        .insert({
          user_id: user.id,
          client_id: clientId,
          year: currentYear
        });

      if (error) {
        console.error('Erro ao registrar saudação:', error);
        return { error: 'Erro ao registrar saudação enviada' };
      }

      return { error: null };
    } catch (err) {
      console.error('Erro ao marcar saudação como enviada:', err);
      return { error: 'Erro ao registrar saudação' };
    } finally {
      setLoading(false);
    }
  };

  const sendBirthdayGreeting = async (client: BirthdayClient) => {
    // Primeiro, registra no banco
    const result = await markGreetingAsSent(client.clientId);
    
    if (result.error) {
      return { error: result.error };
    }

    // Só abre o WhatsApp se conseguiu registrar no banco
    try {
      const phone = client.clientPhone.replace(/\D/g, '');
      const message = encodeURIComponent(client.processedMessage);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=55${phone}&text=${message}`;
      
      window.open(whatsappUrl, '_blank');
      return { error: null };
    } catch (err) {
      console.error('Erro ao abrir WhatsApp:', err);
      return { error: 'Erro ao abrir WhatsApp' };
    }
  };

  const processClients = (clients: any[]): BirthdayClient[] => {
    if (!clients || !profile) return [];

    return clients.map(client => {
      const age = calculateAge(client.birthDate);
      const processedMessage = processMessage(
        profile.birthday_message_template || '',
        client.name,
        age
      );

      return {
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        processedMessage,
        age
      };
    });
  };

  return {
    sendBirthdayGreeting,
    processClients,
    loading
  };
}
