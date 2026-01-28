import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrokerageData {
  id: number;
  name: string;
  logo_url: string | null;
  slug: string;
}

interface GetBrokerageResponse {
  success: boolean;
  brokerage?: BrokerageData;
  error?: string;
}

interface ClientMatch {
  id: string;
  name: string;
  email: string | null;
  cpf_cnpj: string | null;
  user_id: string;
}

export default function PortalLogin() {
  const { brokerageSlug } = useParams<{ brokerageSlug: string }>();
  const [identifier, setIdentifier] = useState('');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBrokerage, setIsLoadingBrokerage] = useState(true);
  const [brokerage, setBrokerage] = useState<BrokerageData | null>(null);
  const [isValidBrokerage, setIsValidBrokerage] = useState(true);
  const [matchedClients, setMatchedClients] = useState<ClientMatch[]>([]);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const navigate = useNavigate();

  // Fetch brokerage data on mount
  useEffect(() => {
    const fetchBrokerage = async () => {
      if (!brokerageSlug) {
        setIsValidBrokerage(false);
        setIsLoadingBrokerage(false);
        return;
      }

      try {
        const { data, error: rpcError } = await supabase.rpc('get_brokerage_by_slug', {
          p_slug: brokerageSlug
        });

        if (rpcError) {
          console.error('Error fetching brokerage:', rpcError);
          setIsValidBrokerage(false);
          setIsLoadingBrokerage(false);
          return;
        }

        const response = data as unknown as GetBrokerageResponse;

        if (response?.success && response?.brokerage) {
          setBrokerage(response.brokerage);
          setIsValidBrokerage(true);
        } else {
          setIsValidBrokerage(false);
        }
      } catch (err) {
        console.error('Error:', err);
        setIsValidBrokerage(false);
      } finally {
        setIsLoadingBrokerage(false);
      }
    };

    fetchBrokerage();
  }, [brokerageSlug]);

  const handleLogin = async () => {
    if (!identifier.trim()) {
      setError('Digite seu CPF, e-mail ou nome completo');
      return;
    }

    if (!brokerageSlug) {
      setError('Corretora não identificada');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Chama a nova função de identificação sem senha
      const { data, error: rpcError } = await supabase.rpc('identify_portal_client', {
        p_identifier: identifier.trim(),
        p_brokerage_slug: brokerageSlug
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        setError('Erro ao realizar login');
        setIsLoading(false);
        return;
      }

      const clients = (data as unknown as ClientMatch[]) || [];

      if (clients.length === 0) {
        // Nenhum cliente encontrado
        setError('Cliente não encontrado nesta corretora');
        setIsLoading(false);
        return;
      }

      if (clients.length === 1) {
        // Login direto - único cliente encontrado
        completeLogin(clients[0]);
        return;
      }

      // Múltiplos clientes (homônimos) - solicitar confirmação
      setMatchedClients(clients);
      setNeedsConfirmation(true);
      setIsLoading(false);

    } catch (err) {
      console.error('Login error:', err);
      setError('Erro ao realizar login');
      setIsLoading(false);
    }
  };

  const handleConfirmation = () => {
    if (!confirmationInput.trim()) {
      setError('Digite seu CPF ou e-mail para confirmar');
      return;
    }

    const cleanInput = confirmationInput.trim().toLowerCase();
    const cleanCpf = confirmationInput.replace(/\D/g, '');

    // Filtra pelo CPF ou email
    const matched = matchedClients.find(client => {
      const clientCpf = client.cpf_cnpj?.replace(/\D/g, '') || '';
      const clientEmail = client.email?.toLowerCase() || '';
      
      return clientCpf === cleanCpf || clientEmail === cleanInput;
    });

    if (!matched) {
      setError('Não foi possível confirmar sua identidade. Verifique os dados.');
      return;
    }

    setIsLoading(true);
    completeLogin(matched);
  };

  const completeLogin = (client: ClientMatch) => {
    // Salva os dados na sessão
    sessionStorage.setItem('portal_client', JSON.stringify(client));
    sessionStorage.setItem('portal_brokerage_slug', brokerageSlug!);
    if (brokerage) {
      sessionStorage.setItem('portal_brokerage', JSON.stringify(brokerage));
    }

    toast.success(`Bem-vindo, ${client.name?.split(' ')[0]}!`);
    navigate(`/${brokerageSlug}/portal/home`, { replace: true });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (needsConfirmation) {
        handleConfirmation();
      } else {
        handleLogin();
      }
    }
  };

  const resetForm = () => {
    setNeedsConfirmation(false);
    setMatchedClients([]);
    setConfirmationInput('');
    setError('');
  };

  // Loading state - Black & Silver
  if (isLoadingBrokerage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(39,39,42,0.25)_0%,_transparent_55%)]" />
        <div className="relative flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          <p className="text-zinc-500 tracking-widest text-sm font-light">CARREGANDO</p>
        </div>
      </div>
    );
  }

  // Invalid brokerage - Black & Silver
  if (!isValidBrokerage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(39,39,42,0.25)_0%,_transparent_55%)]" />
        <Card 
          className="relative w-full max-w-md bg-black/70 backdrop-blur-2xl border border-white/[0.06]"
          style={{ boxShadow: '0 0 60px -15px rgba(255,255,255,0.07)' }}
        >
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-white/[0.06]">
              <Shield className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-xl text-white font-light tracking-wide mb-2">Portal não encontrado</h2>
            <p className="text-zinc-500 font-light">
              O portal solicitado não existe ou não está disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      {/* Subtle radial gradient - Silver */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(39,39,42,0.25)_0%,_transparent_55%)] pointer-events-none" />
      
      <Card 
        className="relative w-full max-w-md bg-black/70 backdrop-blur-2xl border border-white/[0.06]"
        style={{ boxShadow: '0 0 60px -15px rgba(255,255,255,0.07)' }}
      >
        <CardContent className="p-8 space-y-6">
          {/* Brokerage Logo/Name */}
          <div className="text-center space-y-4">
            {brokerage?.logo_url ? (
              <img 
                src={brokerage.logo_url} 
                alt={brokerage.name} 
                className="h-16 object-contain mx-auto"
              />
            ) : (
              <h1 className="text-3xl font-light tracking-widest text-white">
                {brokerage?.name || 'PORTAL'}
              </h1>
            )}
            <p className="text-zinc-500 text-sm tracking-wide font-light">
              Acesse suas apólices e informações
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-4">
            {!needsConfirmation ? (
              // Formulário inicial - apenas identificador
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-zinc-400 text-sm font-light tracking-wide">
                  CPF, E-mail ou Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Digite seu CPF, e-mail ou nome"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                    onKeyPress={handleKeyPress}
                    className="bg-black/60 border-zinc-700/50 text-white placeholder:text-zinc-600 pl-10 h-12 rounded-xl focus:border-zinc-400/60 focus:ring-1 focus:ring-zinc-400/20"
                  />
                </div>
              </div>
            ) : (
              // Formulário de confirmação (homônimos)
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-200 text-sm font-medium">
                        Encontramos {matchedClients.length} clientes com esse nome
                      </p>
                      <p className="text-amber-400/70 text-xs mt-1">
                        Para sua segurança, confirme sua identidade
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmation" className="text-zinc-400 text-sm font-light tracking-wide">
                    Confirme seu CPF ou E-mail
                  </Label>
                  <Input
                    id="confirmation"
                    type="text"
                    placeholder="Digite seu CPF ou e-mail"
                    value={confirmationInput}
                    onChange={(e) => { setConfirmationInput(e.target.value); setError(''); }}
                    onKeyPress={handleKeyPress}
                    className="bg-black/60 border-zinc-700/50 text-white placeholder:text-zinc-600 h-12 rounded-xl focus:border-zinc-400/60 focus:ring-1 focus:ring-zinc-400/20"
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
                >
                  ← Voltar
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-sm text-center font-light">{error}</p>
              </div>
            )}

            {/* Silver Metallic Button */}
            <Button 
              onClick={needsConfirmation ? handleConfirmation : handleLogin} 
              className="w-full h-12 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-base tracking-wide transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : needsConfirmation ? (
                'Confirmar e Entrar'
              ) : (
                'Entrar'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
