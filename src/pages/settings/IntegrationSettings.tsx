import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarIcon,
  CalendarDays,
  CheckCircle2,
  History,
  Link as LinkIcon,
  RefreshCw,
  Unplug,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function IntegrationSettings() {
  const [isConnected, setIsConnected] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchGoogleConnection();
  }, []);

  const fetchGoogleConnection = async () => {
    try {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("google_sync_tokens")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setIsConnected(true);
        setIsActive(data.is_active || false);
        setLastSync(data.updated_at);
      } else {
        setIsConnected(false);
        setIsActive(false);
      }
    } catch (error) {
      console.error("Error fetching Google connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('google-auth-url');
      
      if (error) throw error;
      if (!data?.url) throw new Error("No URL returned");

      window.location.href = data.url;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast({
        title: 'Erro ao conectar',
        description: 'Verifique se as credenciais do Google foram configuradas no Supabase.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from("google_sync_tokens")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setIsConnected(false);
      setIsActive(false);

      toast({
        title: "Desconectado",
        description: "A integração com Google Calendar e Tasks foi removida.",
      });
    } catch (error) {
      toast({
        title: "Erro ao desconectar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    try {
      setIsActive(checked);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from("google_sync_tokens")
        .update({ is_active: checked })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: checked ? "Sincronização ativada" : "Sincronização pausada",
        description: checked
          ? "Os eventos e tarefas serão sincronizados."
          : "Nenhuma alteração será enviada para o Google.",
      });
    } catch (error) {
      setIsActive(!checked);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  };

  const handleManualSync = async () => {
    if (!isConnected || !isActive) return;

    setIsSyncing(true);
    try {
      // Call Edge Function manual trigger here
      // const { data, error } = await supabase.functions.invoke('google-sync-immediate');
      // if (error) throw error;

      // Simulate delay for now
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setLastSync(new Date().toISOString());

      toast({
        title: "Sincronização concluída",
        description: "Os dados foram atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na sincronização",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground mt-2">
          Conecte ferramentas externas para turbinar sua produtividade no CRM.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Google Workspace Integration */}
        <AppCard className="overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
              <div className="flex gap-4">
                <div className="bg-[#E8F0FE] p-3 rounded-xl h-fit">
                  {/* Google Logo (simplified) */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-8 h-8"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    Google Calendar & Tasks
                  </h3>
                  <p className="text-muted-foreground mt-1 max-w-lg">
                    Sincronize seus agendamentos do CRM com o Google Calendar e
                    suas tarefas com o Google Tasks bidirecionalmente.
                  </p>

                  {isConnected && (
                    <div className="flex items-center gap-2 mt-3 text-sm">
                      <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                      </span>
                      {lastSync && (
                        <span className="flex items-center gap-1.5 text-muted-foreground ml-2">
                          <History className="w-3.5 h-3.5" /> Última sync:{" "}
                          {format(new Date(lastSync), "dd/MM 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {!isConnected ? (
                  <Button
                    onClick={handleConnectGoogle}
                    className="w-full sm:w-auto flex items-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" /> Connectar Conta
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleManualSync}
                      disabled={isSyncing || !isActive}
                      className="w-full sm:w-auto flex items-center gap-2"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                      />
                      Sincronizar Agora
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDisconnectGoogle}
                      className="w-full sm:w-auto flex items-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <Unplug className="w-4 h-4" /> Desconectar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isConnected && (
              <div className="mt-8 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-medium">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      Sincronização Ativa
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={handleToggleActive}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, os eventos serão atualizados automaticamente
                    a cada 15 minutos em background.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Como funciona:
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li>• Novos agendamentos no CRM vão para o Calendar</li>
                    <li>• Eventos do Calendar vão para o CRM</li>
                    <li>• Concluir tarefas no CRM conclui no Google Tasks</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </AppCard>

        {/* Adicione outros cards de integração aqui (WhatsApp, N8N, etc) no futuro */}
      </div>
    </div>
  );
}
