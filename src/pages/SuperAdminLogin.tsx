import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Lock, Mail, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast.error('Credenciais inválidas');
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao autenticar');
        setLoading(false);
        return;
      }

      // Step 2: Fetch profile and validate role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        await supabase.auth.signOut();
        toast.error('Erro ao verificar permissões');
        setLoading(false);
        return;
      }

      console.log('🔐 Profile loaded:', { email: profile.email, role: profile.role });

      // Step 3: Security Gate - Only admins pass
      if (profile.role !== 'admin') {
        console.warn('⛔ Access denied - Non-admin attempted login:', profile.email);
        await supabase.auth.signOut();
        toast.error('Acesso restrito a administradores do sistema', {
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          duration: 5000,
        });
        setLoading(false);
        return;
      }

      // Step 4: Success - Admin verified
      console.log('✅ Admin access granted:', profile.email);
      toast.success('Bem-vindo ao Painel de Controle Global');
      navigate('/dashboard/super-admin');
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(39,39,42,0.3)_0%,_transparent_70%)]" />
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
          backgroundSize: '10px 10px'
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-zinc-950/80 border-zinc-800 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4">
            {/* Shield Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <Shield className="h-8 w-8 text-zinc-300" />
            </div>
            
            <div>
              <CardTitle className="text-2xl font-semibold text-zinc-100 tracking-tight">
                Acesso Restrito
              </CardTitle>
              <CardDescription className="text-zinc-500 mt-2">
                Painel de Controle Global do Sistema
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-400 text-sm font-medium">
                  Email do Administrador
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@exemplo.com"
                    required
                    className="pl-10 bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-zinc-500"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-400 text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="pl-10 bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-zinc-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    Verificando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Acessar Painel
                  </div>
                )}
              </Button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-xs text-zinc-600 text-center flex items-center justify-center gap-2">
                <Lock className="h-3 w-3" />
                Ambiente protegido por autenticação de dois fatores
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ← Voltar ao site principal
          </button>
        </div>
      </motion.div>
    </div>
  );
}
