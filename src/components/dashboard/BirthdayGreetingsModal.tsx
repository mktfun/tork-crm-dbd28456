
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBirthdayGreetings } from '@/hooks/useBirthdayGreetings';
import { MessageSquare, Phone, Cake, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BirthdayClient {
  clientId: string;
  clientName: string;
  clientPhone: string;
  processedMessage: string;
  age: number;
}

interface BirthdayGreetingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: BirthdayClient[];
  onGreetingSent: () => void;
}

export function BirthdayGreetingsModal({ 
  open, 
  onOpenChange, 
  clients,
  onGreetingSent 
}: BirthdayGreetingsModalProps) {
  const { sendBirthdayGreeting, loading } = useBirthdayGreetings();
  const [sentGreetings, setSentGreetings] = useState<Set<string>>(new Set());

  const handleSendGreeting = async (client: BirthdayClient) => {
    const result = await sendBirthdayGreeting(client);
    
    if (result.error) {
      toast.error('Erro ao enviar saudação', {
        description: result.error
      });
    } else {
      setSentGreetings(prev => new Set([...prev, client.clientId]));
      toast.success('Saudação enviada!', {
        description: `WhatsApp aberto para ${client.clientName}`
      });
      
      // Notify parent to refresh data
      onGreetingSent();
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  if (clients.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-500" />
              Aniversariantes de Hoje
            </DialogTitle>
            <DialogDescription>
              Não há aniversariantes para saudar hoje ou todas as saudações já foram enviadas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="text-center text-muted-foreground">
              <Cake className="h-12 w-12 mx-auto mb-2 text-pink-300" />
              <p>Nenhuma saudação pendente</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Aniversariantes de Hoje ({clients.length})
          </DialogTitle>
          <DialogDescription>
            Envie saudações personalizadas via WhatsApp para seus clientes que fazem aniversário hoje.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {clients.map((client) => {
            const isSent = sentGreetings.has(client.clientId);
            
            return (
              <Card key={client.clientId} className="border-l-4 border-l-pink-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{client.clientName}</h3>
                        <span className="text-sm bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                          {client.age} anos
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {formatPhone(client.clientPhone)}
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <p className="text-sm font-medium mb-1">Mensagem que será enviada:</p>
                        <p className="text-sm text-gray-700 italic">"{client.processedMessage}"</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {isSent ? (
                        <Button variant="outline" disabled className="text-green-600">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Enviado
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSendGreeting(client)}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <MessageSquare className="h-4 w-4 mr-2" />
                          )}
                          Enviar WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="text-xs text-muted-foreground mt-4 p-3 bg-blue-50 rounded-lg">
          <p>💡 <strong>Dica:</strong> Ao clicar em "Enviar WhatsApp", a saudação será registrada como enviada e o WhatsApp será aberto automaticamente com a mensagem personalizada.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
