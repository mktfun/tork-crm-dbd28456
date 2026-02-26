import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Loader2, Search, Building2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface PublicBrokerage {
  id: number;
  name: string;
  logo_url: string | null;
  slug: string;
}

export default function PortalMobileStart() {
  const [searchQuery, setSearchQuery] = useState('');
  const [brokerages, setBrokerages] = useState<PublicBrokerage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [failedLogos, setFailedLogos] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(searchQuery, 200);

  // Auto-redirect se já tiver corretora salva
  useEffect(() => {
    const savedSlug = localStorage.getItem('capacitor_portal_slug');
    if (savedSlug) {
      navigate(`/${savedSlug}/portal`, { replace: true });
    }
  }, [navigate]);

  // Fetch brokerages on mount
  useEffect(() => {
    const fetchBrokerages = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data, error: rpcError } = await supabase.rpc('get_public_brokerages');
        if (rpcError) throw rpcError;
        setBrokerages((data as PublicBrokerage[]) || []);
      } catch (err) {
        console.error('Erro ao buscar corretoras:', err);
        setError('Não foi possível carregar as corretoras.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBrokerages();
  }, []);

  const filteredBrokerages = useMemo(() => {
    if (!debouncedQuery.trim()) return brokerages;
    const q = debouncedQuery.toLowerCase();
    return brokerages.filter(b => b.name.toLowerCase().includes(q));
  }, [brokerages, debouncedQuery]);

  const handleSelect = (brokerage: PublicBrokerage) => {
    localStorage.setItem('capacitor_portal_slug', brokerage.slug);
    navigate(`/${brokerage.slug}/portal`, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background safe-area-pt">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="w-20 h-20 rounded-[2rem] bg-card border border-border flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <Shield className="w-10 h-10 text-primary relative z-10" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
          Portal do Cliente
        </h1>
        <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed mx-auto">
          Selecione sua corretora para começar.
        </p>
      </div>

      {/* Bottom Sheet */}
      <div className="bg-card/80 backdrop-blur-2xl border-t border-border rounded-t-[2.5rem] px-6 pt-8 pb-10 sm:px-8 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)] safe-area-pb animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
        {/* Search */}
        <div className="relative group mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="search"
            placeholder="Buscar corretora..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background/50 border-input text-foreground placeholder:text-muted-foreground/40 pl-12 h-14 rounded-2xl text-base shadow-sm focus-visible:ring-1 focus-visible:ring-primary/50 transition-all"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            {filteredBrokerages.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma corretora encontrada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBrokerages.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelect(b)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-card border border-border hover:bg-muted/50 active:scale-[0.98] transition-all duration-150 text-left group"
                  >
                    {/* Logo */}
                    <div className="w-11 h-11 rounded-xl bg-muted/60 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {b.logo_url && !failedLogos.has(b.id) ? (
                        <img
                          src={b.logo_url}
                          alt={b.name}
                          className="w-full h-full object-cover"
                          onError={() => setFailedLogos(prev => new Set(prev).add(b.id))}
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Name */}
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {b.name}
                    </span>

                    {/* Chevron */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
