import React, { useRef } from 'react';
import { Shield, Phone, Calendar, Car, Home, Heart, Briefcase, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPhoneForTel } from '@/utils/insuranceAssistance';
import { toast } from 'sonner';

interface VirtualCardProps {
  policy: {
    id: string;
    type: string | null;
    policy_number: string | null;
    start_date: string | null;
    expiration_date: string;
    insured_asset: string | null;
    carteirinha_url?: string | null;
  };
  clientName: string;
  clientCpf: string | null;
  companyName: string | null;
  assistancePhone: string | null;
  canDownload: boolean;
}

export function VirtualCard({
  policy,
  clientName,
  clientCpf,
  companyName,
  assistancePhone,
  canDownload,
}: VirtualCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const getTypeIcon = (type: string | null) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('auto') || t.includes('carro')) return <Car className="w-6 h-6" />;
    if (t.includes('resid') || t.includes('casa')) return <Home className="w-6 h-6" />;
    if (t.includes('vida') || t.includes('saúde') || t.includes('saude') || t.includes('odonto')) return <Heart className="w-6 h-6" />;
    if (t.includes('empres')) return <Briefcase className="w-6 h-6" />;
    return <Shield className="w-6 h-6" />;
  };

  const formatCpf = (cpf: string | null) => {
    if (!cpf) return '---';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `carteirinha-${policy.policy_number || 'seguro'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Imagem baixada com sucesso!');
    } catch (error) {
      console.error('Error downloading PNG:', error);
      toast.error('Erro ao baixar imagem');
    }
  };

  const handleDownloadPdf = () => {
    if (policy.carteirinha_url) {
      window.open(policy.carteirinha_url, '_blank');
      toast.success('Abrindo carteirinha...');
    }
  };

  return (
    <div className="space-y-3">
      {/* The Card — Force-dark, never respects theme */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#0F1113] to-[#212529] p-5 border border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.25)]"
        style={{ minHeight: '280px' }}
      >
        {/* Subtle metal reflections */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/[0.03] blur-2xl" />
          <div className="absolute -left-6 -bottom-6 w-36 h-36 rounded-full bg-white/[0.02] blur-xl" />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-white/[0.06] rounded-xl flex items-center justify-center text-zinc-400 border border-white/[0.06]">
                {getTypeIcon(policy.type)}
              </div>
              <div>
                <span className="text-white/90 font-medium text-sm block tracking-tight">
                  {policy.type || 'Seguro'}
                </span>
                {companyName && (
                  <span className="text-zinc-500 text-xs">{companyName}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">CARTEIRINHA</span>
              <span className="text-zinc-600 text-[9px] block tracking-[0.15em]">DIGITAL</span>
            </div>
          </div>

          {/* Main Info — Aeronautical Typography */}
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Segurado</p>
              <p className="text-white text-lg font-medium truncate tracking-tight">{clientName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">CPF</p>
                <p className="text-white text-base font-medium font-mono tracking-tight">{formatCpf(clientCpf)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Nº Apólice</p>
                <p className="text-white text-base font-medium truncate tracking-tight">{policy.policy_number || 'Pendente'}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Vigência
              </p>
              <p className="text-white text-base font-medium tracking-tight">
                {policy.start_date
                  ? format(new Date(policy.start_date), 'dd/MM/yyyy', { locale: ptBR })
                  : '---'}
                {' → '}
                {format(new Date(policy.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>

            {policy.insured_asset && (
              <div className="p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <p className="text-zinc-400 text-sm truncate">{policy.insured_asset}</p>
              </div>
            )}
          </div>

          {/* Assistance */}
          {assistancePhone && (
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <a
                href={`tel:${formatPhoneForTel(assistancePhone)}`}
                className="flex items-center justify-between p-3 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl border border-white/[0.06] transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/[0.06] rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Assistência 24H</p>
                    <p className="text-white font-medium">{assistancePhone}</p>
                  </div>
                </div>
                <span className="text-zinc-500 text-xs tracking-wide">LIGAR →</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Download Buttons */}
      {canDownload && policy.carteirinha_url && (
        <div className="space-y-2">
          <Button
            onClick={handleDownloadPdf}
            className="w-full bg-[#1A1C1E] hover:bg-[#2A2C2E] text-white rounded-full py-3"
          >
            <FileText className="w-4 h-4 mr-2" />
            Baixar Carteirinha (PDF)
          </Button>
          <Button
            onClick={handleDownloadPng}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground rounded-full"
          >
            <Image className="w-4 h-4 mr-2" />
            Baixar como Imagem (PNG)
          </Button>
        </div>
      )}

      {canDownload && !policy.carteirinha_url && (
        <Button
          onClick={handleDownloadPng}
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground rounded-full"
        >
          <Image className="w-4 h-4 mr-2" />
          Baixar como Imagem (PNG)
        </Button>
      )}
    </div>
  );
}
