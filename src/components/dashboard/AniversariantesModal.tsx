
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { MessageCircle, Cake } from 'lucide-react';
import { generateWhatsAppUrl } from '@/utils/whatsapp';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  aniversario: string;
}

interface AniversariantesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aniversariantes: Cliente[];
}

export function AniversariantesModal({
  open,
  onOpenChange,
  aniversariantes
}: AniversariantesModalProps) {
  const [mensagens, setMensagens] = useState<Record<string, string>>({});

  const getMensagemPadrao = (nomeCliente: string) => {
    const primeiroNome = nomeCliente.split(' ')[0];
    return `Olá ${primeiroNome}! Tudo bem? 🎂\n\nPassando para desejar um feliz aniversário e muitas felicidades! Que este novo ano de vida seja repleto de conquistas, alegrias e realizações.\n\n🎉 Parabéns! 🎉\n\nAbraços,\nJoão Silva - Silva & Associados`;
  };

  const handleMensagemChange = (clienteId: string, mensagem: string) => {
    setMensagens(prev => ({
      ...prev,
      [clienteId]: mensagem
    }));
  };

  const handleEnviarWhatsApp = (cliente: Cliente) => {
    const mensagem = mensagens[cliente.id] || getMensagemPadrao(cliente.nome);
    const whatsappUrl = generateWhatsAppUrl(cliente.telefone, mensagem);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Cake className="h-5 w-5 text-yellow-400" />
            Aniversariantes de Hoje ({aniversariantes.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {aniversariantes.length === 0 ? (
            <div className="text-center py-8">
              <Cake className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum aniversariante hoje!</p>
            </div>
          ) : (
            aniversariantes.map((cliente) => (
              <div key={cliente.id} className="border border-slate-800 rounded-lg p-4 bg-slate-900/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-500/20 rounded-full">
                    <Cake className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{cliente.nome}</h3>
                    <p className="text-sm text-slate-400">{cliente.telefone}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor={`mensagem-${cliente.id}`} className="text-slate-400">
                    Mensagem de Parabéns
                  </Label>
                  <Textarea
                    id={`mensagem-${cliente.id}`}
                    placeholder="Digite sua mensagem..."
                    value={mensagens[cliente.id] || getMensagemPadrao(cliente.nome)}
                    onChange={(e) => handleMensagemChange(cliente.id, e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                  <Button
                    onClick={() => handleEnviarWhatsApp(cliente)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Enviar via WhatsApp
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
