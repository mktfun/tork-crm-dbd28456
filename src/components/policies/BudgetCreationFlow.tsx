import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSupabaseClients } from '@/hooks/useSupabaseClients';
import { usePolicies } from '@/hooks/useAppData';
import { useCreateProposal } from '@/hooks/useProposals';
import { ProposalPDFImporter } from '@/components/crm/proposals/ProposalPDFImporter';
import { ProposalOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, User, Loader2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface BudgetCreationFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BudgetCreationFlow({ isOpen, onClose }: BudgetCreationFlowProps) {
  const navigate = useNavigate();
  const { clients } = useSupabaseClients();
  const { addPolicy } = usePolicies();
  const createProposal = useCreateProposal();

  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [extractedOptions, setExtractedOptions] = useState<Partial<ProposalOption>[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.cpfCnpj && c.cpfCnpj.includes(searchQuery))
  ).slice(0, 8);

  const handleReset = () => {
    setStep(1);
    setSearchQuery('');
    setSelectedClientId(null);
    setExtractedOptions([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleImportComplete = (options: Partial<ProposalOption>[], clientName?: string) => {
    setExtractedOptions(options);
  };

  const handleGenerateProposal = async () => {
    if (!selectedClientId) return;
    setIsSaving(true);
    try {
      // 1. Criar o orçamento (apólice com status Orçamento e dados mínimos)
      const newPolicy = await addPolicy({
        clientId: selectedClientId,
        status: 'Orçamento',
        insuredAsset: '',
        premiumValue: 0,
        commissionRate: 0,
        expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        automaticRenewal: false,
      });

      if (newPolicy && extractedOptions.length > 0) {
        // 2. Criar a proposta interativa vinculada ao policyId (usado como deal_id)
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        await createProposal.mutateAsync({
          deal_id: newPolicy.id,
          title: `Proposta Auto — ${selectedClient?.name || 'Cliente'}`,
          client_name: selectedClient?.name,
          client_phone: selectedClient?.phone,
          token,
          options: extractedOptions,
        });
      }

      // 3. Redirecionar para a página de detalhe do orçamento
      handleClose();
      navigate(`/dashboard/policies/${newPolicy.id}`);
    } catch (e) {
      console.error('Erro ao gerar proposta:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }
  };

  const slideRight = {
    initial: { x: 40, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  const listItemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.04, duration: 0.2 }
    })
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-background border-border p-0 overflow-hidden rounded-3xl gap-0">
        {/* Barra de progresso */}
        <div className="flex h-1 w-full">
          <div
            className="bg-primary transition-all duration-500 ease-in-out rounded-full"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        <AnimatePresence mode="wait">
          {/* ─── STEP 1: Selecionar Cliente ─── */}
          {step === 1 && (
            <motion.div
              key="step1"
              {...slideRight}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="p-6 space-y-5"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <User className="w-5 h-5" />
                  <span className="text-xs font-bold tracking-widest uppercase">Passo 1 de 2</span>
                </div>
                <h2 className="text-xl font-bold text-foreground">Para qual cliente é este orçamento?</h2>
                <p className="text-sm text-muted-foreground">Selecione o cliente cadastrado no CRM.</p>
              </div>

              <Input
                autoFocus
                placeholder="🔍  Buscar por nome ou CPF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 text-base"
              />

              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {filteredClients.map((client, i) => (
                  <motion.button
                    key={client.id}
                    custom={i}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedClientId === client.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40'
                    }`}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {client.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{client.name}</p>
                      {client.phone && (
                        <p className="text-xs text-muted-foreground">{client.phone}</p>
                      )}
                    </div>
                    {selectedClientId === client.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </motion.button>
                ))}
                {filteredClients.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Nenhum cliente encontrado.</p>
                )}
              </div>

              <Button
                className="w-full h-11 text-base"
                disabled={!selectedClientId}
                onClick={() => setStep(2)}
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* ─── STEP 2: Importar PDF ─── */}
          {step === 2 && (
            <motion.div
              key="step2"
              {...slideRight}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="p-6 space-y-5"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <span className="text-xs font-bold tracking-widest uppercase">Passo 2 de 2</span>
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Cotação de {selectedClient?.name?.split(' ')[0]}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Importe o PDF com as opções de seguro. A IA irá extrair tudo automaticamente.
                </p>
              </div>

              <ProposalPDFImporter onImportComplete={handleImportComplete} />

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  className="flex-1 h-11"
                  onClick={handleGenerateProposal}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {isSaving ? 'Gerando...' : extractedOptions.length > 0 ? 'Gerar Proposta ✓' : 'Criar Orçamento'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
