import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileFormData } from '@/schemas/profileSchema';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Camera, UserCircle, Shield, Briefcase } from 'lucide-react';

type ExtendedProfileFormData = ProfileFormData & {
  birthday_message_template?: string;
  role?: string;
};

export function ProfileForm() {
  const { data: profile, isLoading, refetch } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile?.role === 'admin';

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<ExtendedProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome_completo: '',
      email: '',
      telefone: '',
      birthday_message_template: '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        nome_completo: profile.nome_completo || '',
        email: profile.email || '',
        telefone: profile.telefone || '',
        birthday_message_template: profile.birthday_message_template || '',
      });
    }
  }, [profile, reset]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) return toast.error('Por favor, selecione uma imagem válida (JPG, PNG, etc.)');
    if (file.size > 5 * 1024 * 1024) return toast.error('A imagem deve ter no máximo 5MB');

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Foto de perfil atualizada com sucesso!');
      refetch();
    } catch (error: any) {
      console.error('Erro ao fazer upload do avatar:', error);
      toast.error('Erro ao atualizar foto de perfil');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getInitials = (name: string) => name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

  const onSubmit = async (data: ExtendedProfileFormData) => {
    try {
      setIsSubmitting(true);
      const updateData: any = {
        nome_completo: data.nome_completo,
        email: data.email,
        telefone: data.telefone || null,
        birthday_message_template: data.birthday_message_template || null
      };

      if (isAdmin && data.role) updateData.role = data.role;

      await updateProfileMutation.mutateAsync(updateData);
      toast.success('Perfil atualizado com sucesso!');
      reset(data);
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(error.message?.includes('row-level security') ? 'Erro de permissão ao atualizar perfil' : 'Erro ao atualizar perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center p-12 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!profile) return <div className="p-8 text-center text-muted-foreground">Não foi possível carregar os dados do perfil.</div>;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-white/5 shadow-sm max-w-4xl mx-auto">
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">Meu Perfil</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visualização e edição das suas credenciais
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto w-full">
        {/* Superior com Avatar */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 px-6 py-8 border-b border-white/5 bg-white/[0.01]">
          <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
            <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.nome_completo} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary/40 text-foreground text-3xl font-semibold">
                {getInitials(profile.nome_completo || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploadingAvatar ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <div className="text-center sm:text-left pt-2 pb-0 sm:pb-2">
            <h3 className="text-xl font-bold text-foreground">{profile.nome_completo}</h3>
            <p className="text-muted-foreground font-medium mt-1">{profile.email}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-semibold tracking-wide uppercase">
              {isAdmin ? <Shield className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
              {profile.role || 'Usuário'}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Section 1 */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest pl-2">Informações Pessoais</h3>
            <div className="bg-background rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
              <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                <Label htmlFor="nome_completo" className="text-muted-foreground w-1/3 text-left">Nome Completo</Label>
                <Input id="nome_completo" {...register('nome_completo')} className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground font-medium" />
              </div>
              {errors.nome_completo && <p className="text-xs text-destructive px-4 py-2 bg-destructive/10">{errors.nome_completo.message}</p>}

              <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                <Label htmlFor="email" className="text-muted-foreground w-1/3 text-left">E-mail</Label>
                <Input id="email" type="email" {...register('email')} className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground" />
              </div>
              {errors.email && <p className="text-xs text-destructive px-4 py-2 bg-destructive/10">{errors.email.message}</p>}

              <div className="flex sm:items-center px-4 py-3 flex-col sm:flex-row gap-2 sm:gap-0">
                <Label htmlFor="telefone" className="text-muted-foreground w-1/3 text-left">Telefone</Label>
                <Input id="telefone" {...register('telefone')} placeholder="(11) 99999-9999" className="border-0 bg-transparent sm:text-right shadow-none focus-visible:ring-0 px-0 flex-1 text-foreground" />
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest pl-2">Preferências CRM</h3>
            <div className="bg-background rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
              <div className="flex flex-col px-4 py-4 gap-3">
                <Label htmlFor="birthday_message_template" className="text-foreground">Mensagem Automática de Aniversário</Label>
                <Textarea
                  id="birthday_message_template"
                  {...register('birthday_message_template')}
                  placeholder="Parabéns pelo seu aniversário! Desejamos felicidades..."
                  className="border border-white/10 bg-black/20 focus-visible:ring-1 min-h-[100px] text-foreground resize-none rounded-xl"
                />
                <p className="text-xs text-muted-foreground">Use <code className="bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">{"{nome}"}</code> para inserir o nome do cliente automaticamente nesta mensagem.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="p-6 sticky flex-col sm:flex-row bottom-0 bg-card/80 backdrop-blur-md border-t border-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 text-emerald-500/80" /> Suas informações estão seguras.
          </div>

          <Button type="submit" disabled={!isDirty || isSubmitting} className="rounded-full px-8 bg-primary text-primary-foreground min-w-[200px]">
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
            ) : (
              'Salvar Alterações do Perfil'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
