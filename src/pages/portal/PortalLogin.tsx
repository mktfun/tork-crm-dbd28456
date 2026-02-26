import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// Card/CardContent removed — login uses full-screen layout now
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, User, AlertCircle, Lock } from 'lucide-react';
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
  portal_first_access: boolean;
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

  // Password stage states
  const [selectedClient, setSelectedClient] = useState<ClientMatch | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');

  const navigate = useNavigate();

  const formatIdentifier = (value: string) => {
    if (/^[\d.-]+$/.test(value)) {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 11) {
        return digits
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
      }
    }
    return value;
  };

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
          p_slug: brokerageSlug.toLowerCase()
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

  const goToPasswordStage = (client: ClientMatch) => {
    setSelectedClient(client);
    setNeedsPassword(true);
    setIsLoading(false);
  };

  const handleLogin = async () => {
    let cleanIdentifier = identifier.trim();

    if (/^[\d.-]+$/.test(cleanIdentifier) && cleanIdentifier.replace(/\D/g, '').length === 11) {
      cleanIdentifier = cleanIdentifier.replace(/\D/g, '');
    }

    if (!cleanIdentifier) {
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
      const { data, error: rpcError } = await supabase.rpc('identify_portal_client', {
        p_identifier: cleanIdentifier,
        p_brokerage_slug: brokerageSlug.toLowerCase()
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        setError(`Erro ao realizar login (${rpcError.code || 'RPC_FAIL'})`);
        setIsLoading(false);
        return;
      }

      const clients = (data as unknown as ClientMatch[]) || [];

      if (clients.length === 0) {
        setError(`Cliente não encontrado para esta corretora`);
        setIsLoading(false);
        return;
      }

      if (clients.length === 1) {
        goToPasswordStage(clients[0]);
        return;
      }

      setMatchedClients(clients);
      setNeedsConfirmation(true);
      setIsLoading(false);

    } catch (err) {
      console.error('Login catch error:', err);
      setError('Erro inesperado ao realizar login');
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

    const matched = matchedClients.find(client => {
      const clientCpf = client.cpf_cnpj?.replace(/\D/g, '') || '';
      const clientEmail = client.email?.toLowerCase() || '';
      return clientCpf === cleanCpf || clientEmail === cleanInput;
    });

    if (!matched) {
      setError('Não foi possível confirmar sua identidade. Verifique os dados.');
      return;
    }

    goToPasswordStage(matched);
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim() || !selectedClient) {
      setError('Digite sua senha');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'authenticate_portal_client',
        { p_client_id: selectedClient.id, p_password: password }
      );

      if (rpcError) {
        setError('Erro ao validar senha');
        setIsLoading(false);
        return;
      }

      if (data === false) {
        setError('Senha incorreta. Tente novamente.');
        setIsLoading(false);
        return;
      }

      const clientSession = {
        ...selectedClient,
        portal_first_access: selectedClient.portal_first_access,
      };

      sessionStorage.setItem('portal_client', JSON.stringify(clientSession));
      sessionStorage.setItem('portal_brokerage_slug', brokerageSlug!);
      if (brokerage) {
        sessionStorage.setItem('portal_brokerage', JSON.stringify(brokerage));
      }

      toast.success(`Bem-vindo, ${selectedClient.name?.split(' ')[0]}!`);

      if (selectedClient.portal_first_access) {
        navigate(`/${brokerageSlug}/portal/onboarding`, { replace: true });
      } else {
        navigate(`/${brokerageSlug}/portal/home`, { replace: true });
      }
    } catch (err) {
      setError('Erro inesperado');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (needsPassword) {
        handlePasswordSubmit();
      } else if (needsConfirmation) {
        handleConfirmation();
      } else {
        handleLogin();
      }
    }
  };

  const resetForm = () => {
    setNeedsConfirmation(false);
    setNeedsPassword(false);
    setSelectedClient(null);
    setPassword('');
    setMatchedClients([]);
    setConfirmationInput('');
    setError('');
  };

  // Loading state
  if (isLoadingBrokerage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground tracking-widest text-sm font-light">CARREGANDO</p>
        </div>
      </div>
    );
  }

  // Invalid brokerage
  if (!isValidBrokerage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="relative w-full max-w-md bg-card/80 backdrop-blur-2xl border border-border shadow-xl rounded-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 border border-border">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl text-foreground font-light tracking-wide mb-2">Portal não encontrado</h2>
          <p className="text-muted-foreground font-light">
            O portal solicitado não existe ou não está disponível.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Branding — top section */}
      <div className="flex-1 flex flex-col items-center justify-end safe-area-pt pb-8 pt-16 px-6">
        {brokerage?.logo_url ? (
          <img
            src={brokerage.logo_url}
            alt={brokerage.name}
            className="h-20 object-contain mb-4 animate-in fade-in zoom-in-95 duration-500"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-light tracking-widest text-foreground">
              {brokerage?.name || 'PORTAL'}
            </h1>
          </div>
        )}
        <p className="text-muted-foreground text-sm tracking-wide font-light mt-3">
          Acesse suas apólices e informações
        </p>
      </div>

      {/* Form — bottom sheet style */}
      <div className="bg-card backdrop-blur-xl border-t border-border rounded-t-3xl px-6 pt-8 pb-10 safe-area-pb sm:px-8 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-2" />

        {needsPassword && selectedClient ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {selectedClient.portal_first_access && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-amber-600 dark:text-amber-200 text-sm font-medium">
                  Primeiro acesso detectado!
                </p>
                <p className="text-amber-600/70 dark:text-amber-400/70 text-xs mt-1">
                  Sua senha provisória é <strong className="text-amber-700 dark:text-amber-200">123456</strong>
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-light tracking-wide">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyPress={handleKeyPress}
                  className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/50 pl-10 h-12 rounded-xl"
                  autoFocus
                />
              </div>
            </div>
            <button type="button" onClick={resetForm} className="text-muted-foreground text-sm hover:text-foreground transition-colors">
              ← Voltar
            </button>
          </div>
        ) : !needsConfirmation ? (
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-muted-foreground text-sm font-light tracking-wide">
              CPF, E-mail ou Nome Completo
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                id="identifier"
                type="text"
                placeholder="Digite seu CPF, e-mail ou nome"
                value={identifier}
                onChange={(e) => { setIdentifier(formatIdentifier(e.target.value)); setError(''); }}
                onKeyPress={handleKeyPress}
                className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/50 pl-10 h-12 rounded-xl"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-600 dark:text-amber-200 text-sm font-medium">
                    Encontramos {matchedClients.length} clientes com esse nome
                  </p>
                  <p className="text-amber-600/70 dark:text-amber-400/70 text-xs mt-1">
                    Para sua segurança, confirme sua identidade
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-muted-foreground text-sm font-light tracking-wide">
                Confirme seu CPF ou E-mail
              </Label>
              <Input
                id="confirmation"
                type="text"
                placeholder="Digite seu CPF ou e-mail"
                value={confirmationInput}
                onChange={(e) => { setConfirmationInput(formatIdentifier(e.target.value)); setError(''); }}
                onKeyPress={handleKeyPress}
                className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/50 h-12 rounded-xl"
                autoFocus
              />
            </div>
            <button type="button" onClick={resetForm} className="text-muted-foreground text-sm hover:text-foreground transition-colors">
              ← Voltar
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-500 dark:text-red-400 text-sm text-center font-light">{error}</p>
          </div>
        )}

        <Button
          onClick={needsPassword ? handlePasswordSubmit : needsConfirmation ? handleConfirmation : handleLogin}
          className="w-full h-12 rounded-full text-base tracking-wide transition-all active:scale-[0.98]"
          variant="silver"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Entrando...
            </>
          ) : needsPassword ? (
            'Entrar'
          ) : needsConfirmation ? (
            'Confirmar e Entrar'
          ) : (
            'Entrar'
          )}
        </Button>
      </div>
    </div>
  );
}
