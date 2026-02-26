import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Search, ArrowRight, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function PortalMobileStart() {
    const [slug, setSlug] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Se já tiver uma corretora salva, pula direto pro login dela
    useEffect(() => {
        const savedSlug = localStorage.getItem('capacitor_portal_slug');
        if (savedSlug) {
            navigate(`/${savedSlug}/portal`, { replace: true });
        }
    }, [navigate]);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const cleanSlug = slug.trim().toLowerCase();

        if (!cleanSlug) {
            setError('Por favor, informe a corretora.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Usamos a função RPC pública já existente
            const { data, error: rpcError } = await supabase.rpc('get_brokerage_by_slug', {
                p_slug: cleanSlug
            });

            if (rpcError) throw rpcError;

            const response = data as any;

            if (response?.success && response?.brokerage) {
                // Salva na memória persitente do celular/webview
                localStorage.setItem('capacitor_portal_slug', cleanSlug);
                // Redireciona para o login real
                navigate(`/${cleanSlug}/portal`, { replace: true });
            } else {
                setError('Corretora não encontrada. Verifique o link fornecido a você.');
            }
        } catch (err) {
            console.error(err);
            setError('Ocorreu um erro ao buscar a corretora.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background safe-area-pt">
            {/* Top Graphic Area */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="w-20 h-20 rounded-[2rem] bg-card border border-border flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <Shield className="w-10 h-10 text-primary relative z-10" />
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
                    Portal do Cliente
                </h1>
                <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed mx-auto">
                    Para começar, identifique a sua corretora de seguros.
                </p>
            </div>

            {/* Bottom Sheet Action Area */}
            <div className="bg-card/80 backdrop-blur-2xl border-t border-border rounded-t-[2.5rem] px-6 pt-10 pb-12 sm:px-8 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)] safe-area-pb animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">

                <form onSubmit={handleSearch} className="space-y-6">
                    <div className="space-y-3">
                        <Label htmlFor="brokerageCode" className="text-foreground/80 text-sm font-medium tracking-wide ml-1">
                            Código ou Link da Corretora
                        </Label>
                        <div className="relative group">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input
                                id="brokerageCode"
                                type="text"
                                placeholder="Exemplo: minha-corretora"
                                value={slug}
                                onChange={(e) => {
                                    // Se o usuário colar o URL inteiro (tork.com/slug/portal), nós limpamos
                                    let val = e.target.value;
                                    if (val.includes('/portal')) {
                                        val = val.split('/')[3] || val.split('/')[1] || val;
                                    }
                                    setSlug(val);
                                    setError('');
                                }}
                                className="bg-background/50 border-input text-foreground placeholder:text-muted-foreground/40 pl-12 h-14 rounded-2xl text-base shadow-sm focus-visible:ring-1 focus-visible:ring-primary/50 transition-all"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                            <p className="text-destructive text-sm text-center font-medium">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-14 rounded-2xl text-base font-semibold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                        disabled={isLoading || !slug.trim()}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                Buscando...
                            </>
                        ) : (
                            <>
                                Continuar
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </Button>
                </form>

            </div>
        </div>
    );
}
