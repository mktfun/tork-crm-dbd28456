import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Phone, Mail, MapPin, Loader2, Check, KeyRound, Lock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { usePortalPermissions } from '@/hooks/usePortalPermissions';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ClientProfile {
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}

interface UpdateProfileResponse {
  success: boolean;
  error?: string;
}

export default function PortalProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ClientProfile>({
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    cep: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [slug, setSlug] = useState('');

  const { canEditProfile, isLoading: permissionsLoading } = usePortalPermissions();

  useEffect(() => {
    const clientData = sessionStorage.getItem('portal_client');
    const storedSlug = sessionStorage.getItem('portal_brokerage_slug');
    
    if (clientData && storedSlug) {
      const client = JSON.parse(clientData);
      setClientId(client.id);
      setClientName(client.name || '');
      setCurrentPassword(client.portal_password || '');
      setSlug(storedSlug);
      fetchClientData(client.id);
    }
  }, []);

  const fetchClientData = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('phone, email, address, city, state, cep')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching client:', error);
        return;
      }

      if (data) {
        setForm({
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          cep: data.cep || '',
        });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    return value;
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 8) {
      return digits.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleSave = async () => {
    if (!clientId || !currentPassword) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }

    setIsSaving(true);

    try {
      const { data: result, error: rpcError } = await supabase.rpc('update_portal_profile', {
        p_client_id: clientId,
        p_verify_password: currentPassword,
        p_new_password: null,
        p_new_data: {
          phone: form.phone.replace(/\D/g, ''),
          email: form.email,
          address: form.address,
          city: form.city,
          state: form.state,
          cep: form.cep?.replace(/\D/g, '')
        }
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        toast.error('Erro ao salvar dados');
        return;
      }

      const response = result as unknown as UpdateProfileResponse;

      if (!response?.success) {
        toast.error(response?.error || 'Erro ao salvar dados');
        return;
      }

      toast.success('Dados atualizados com sucesso!');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || permissionsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-64 w-full bg-muted rounded-3xl" />
      </div>
    );
  }

  const ProfileRow = ({ icon: Icon, label, children, isLast = false }: { icon: React.ElementType; label: string; children: React.ReactNode; isLast?: boolean }) => (
    <div className={cn('flex items-start gap-3 p-5', !isLast && 'border-b border-muted/50')}>
      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Neobank Profile Header */}
      <h2 className="text-xl font-semibold text-foreground text-center tracking-tight">Perfil</h2>

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-full bg-foreground flex items-center justify-center shadow-lg">
          <User className="w-10 h-10 text-background" />
        </div>
      </div>
      <p className="text-center text-foreground font-semibold text-lg">{clientName}</p>
      <p className="text-center text-muted-foreground text-sm -mt-3">Segurado</p>

      {!canEditProfile && (
        <Alert className="bg-card rounded-2xl border-transparent shadow-sm text-foreground">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-muted-foreground">
            As alterações de cadastro devem ser solicitadas diretamente à sua corretora.
          </AlertDescription>
        </Alert>
      )}

      {/* Personal Info Card */}
      <div className="bg-card rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-muted/50">
          <h3 className="text-foreground font-semibold text-base">Informações Pessoais</h3>
          {canEditProfile && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-sm font-medium text-foreground underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-foreground transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </div>

        <ProfileRow icon={User} label="Nome">
          <p className="text-foreground text-[0.95rem] font-semibold">{clientName}</p>
        </ProfileRow>

        <ProfileRow icon={Mail} label="E-mail">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            readOnly={!canEditProfile}
            className={cn(
              'w-full bg-transparent text-foreground text-[0.95rem] font-semibold focus:outline-none',
              !canEditProfile && 'cursor-not-allowed opacity-60'
            )}
            placeholder="Atualize seu e-mail"
          />
        </ProfileRow>

        <ProfileRow icon={Phone} label="Telefone">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
            readOnly={!canEditProfile}
            maxLength={15}
            className={cn(
              'w-full bg-transparent text-foreground text-[0.95rem] font-semibold focus:outline-none',
              !canEditProfile && 'cursor-not-allowed opacity-60'
            )}
            placeholder="(00) 00000-0000"
          />
        </ProfileRow>

        <ProfileRow icon={MapPin} label="Endereço">
          <input
            type="text"
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            readOnly={!canEditProfile}
            className={cn(
              'w-full bg-transparent text-foreground text-[0.95rem] font-semibold focus:outline-none',
              !canEditProfile && 'cursor-not-allowed opacity-60'
            )}
            placeholder="Rua, número"
          />
        </ProfileRow>

        <ProfileRow icon={MapPin} label="Cidade / Estado">
          <div className="flex gap-2">
            <input
              type="text"
              value={form.city || ''}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              readOnly={!canEditProfile}
              className={cn(
                'flex-1 bg-transparent text-foreground text-[0.95rem] font-semibold focus:outline-none',
                !canEditProfile && 'cursor-not-allowed opacity-60'
              )}
              placeholder="Cidade"
            />
            <input
              type="text"
              value={form.state || ''}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              readOnly={!canEditProfile}
              maxLength={2}
              className={cn(
                'w-12 bg-transparent text-foreground text-[0.95rem] font-semibold focus:outline-none text-right',
                !canEditProfile && 'cursor-not-allowed opacity-60'
              )}
              placeholder="UF"
            />
          </div>
        </ProfileRow>

        <ProfileRow icon={MapPin} label="CEP" isLast>
          <input
            type="text"
            value={form.cep || ''}
            onChange={(e) => setForm({ ...form, cep: formatCep(e.target.value) })}
            readOnly={!canEditProfile}
            maxLength={9}
            className={cn(
              'w-full bg-transparent text-foreground text-[0.95rem] font-semibold focus:outline-none',
              !canEditProfile && 'cursor-not-allowed opacity-60'
            )}
            placeholder="00000-000"
          />
        </ProfileRow>
      </div>

      {/* Account Settings */}
      <div className="bg-card rounded-3xl shadow-sm overflow-hidden">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/${slug}/portal/change-password`)}
          className="w-full text-left p-5 flex justify-between items-center hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-muted-foreground" />
            <span className="text-foreground font-medium">Alterar Senha</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        </motion.button>
      </div>
    </div>
  );
}
