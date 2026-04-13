import React, { useState, useEffect } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import {
  Download,
  ExternalLink,
  FileText,
  Calendar,
  Building2,
  Shield,
  Car,
  Home,
  Heart,
  Briefcase,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PolicyHistoryTimeline } from './PolicyHistoryTimeline';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Policy {
  id: string;
  insured_asset: string | null;
  expiration_date: string;
  start_date: string | null;
  status: string;
  premium_value: number;
  policy_number: string | null;
  insurance_company: string | null;
  type: string | null;
  pdf_attached_data: string | null;
  pdf_url: string | null;
  ramo_id: string | null;
}

interface PolicyDetailModalProps {
  policy: Policy | null;
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientCpf: string | null;
  clientId: string;
  userId: string;
  companyName: string | null;
  canViewPdf: boolean;
  canDownloadPdf: boolean;
}

interface DetailRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  isLast?: boolean;
}

function DetailRow({ icon: Icon, label, value, isLast }: DetailRowProps) {
  return (
    <div className={cn('flex items-start gap-3 py-4', !isLast && 'border-b border-muted/50')}>
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        <p className="text-foreground text-base font-medium tracking-tight truncate">{value}</p>
      </div>
    </div>
  );
}

export function PolicyDetailModal({
  policy,
  isOpen,
  onClose,
  clientName,
  clientCpf,
  clientId,
  userId,
  companyName,
  canViewPdf,
  canDownloadPdf,
}: PolicyDetailModalProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (policy?.pdf_attached_data && canViewPdf) {
      try {
        let pureBase64 = policy.pdf_attached_data;
        if (pureBase64.includes(',')) {
          pureBase64 = pureBase64.split(',')[1];
        }
        const byteCharacters = atob(pureBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      } catch (error) {
        console.error('Error creating PDF blob:', error);
      }
    } else {
      setPdfBlobUrl(null);
    }
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [policy?.pdf_attached_data, canViewPdf]);

  const handleDownload = () => {
    if (!policy) return;
    if (policy.pdf_url) {
      window.open(policy.pdf_url, '_blank');
      return;
    }
    if (pdfBlobUrl) {
      const link = document.createElement('a');
      link.href = pdfBlobUrl;
      link.download = `apolice-${policy.policy_number || policy.id}.pdf`;
      link.click();
      toast.success('Download iniciado!');
    }
  };

  const getTypeIcon = (type: string | null) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('auto') || t.includes('carro')) return Car;
    if (t.includes('resid') || t.includes('casa')) return Home;
    if (t.includes('vida') || t.includes('saúde') || t.includes('saude')) return Heart;
    if (t.includes('empres')) return Briefcase;
    return Shield;
  };

  if (!policy) return null;

  const hasPdf = !!(policy.pdf_attached_data || policy.pdf_url);
  const canDownload = canDownloadPdf && hasPdf;
  const TypeIcon = getTypeIcon(policy.type);

  const vigencia = `${
    policy.start_date
      ? format(new Date(policy.start_date), 'dd/MM/yyyy', { locale: ptBR })
      : '---'
  } → ${format(new Date(policy.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}`;

  return (
    <DrawerPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
        <DrawerPrimitive.Content
          className="fixed bottom-0 left-0 right-0 z-50 mt-24 rounded-t-[32px] border-0 bg-background p-0 overflow-hidden outline-none"
          style={{ maxHeight: '90vh' }}
        >
          {/* Drag handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mt-4 mb-2" />

          {/* Header */}
          <div className="px-6 pb-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-muted/60 flex items-center justify-center">
              <TypeIcon className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <DrawerPrimitive.Title className="text-foreground font-semibold text-lg tracking-tight truncate">
                {policy.insured_asset || policy.type || 'Apólice'}
              </DrawerPrimitive.Title>
              <p className="text-muted-foreground text-sm">
                {policy.policy_number ? `Nº ${policy.policy_number}` : 'Sem número'}
              </p>
            </div>
          </div>

          {/* Receipt body */}
          <div className="px-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <DetailRow icon={User} label="Segurado" value={clientName} />
            {companyName && (
              <DetailRow icon={Building2} label="Seguradora" value={companyName} />
            )}
            <DetailRow icon={Calendar} label="Vigência" value={vigencia} />
            {policy.insured_asset && (
              <DetailRow icon={Shield} label="Bem Segurado" value={policy.insured_asset} />
            )}
            {clientCpf && (
              <DetailRow icon={FileText} label="CPF / CNPJ" value={clientCpf} isLast={!policy.ramo_id} />
            )}

            {/* Timeline */}
            {policy.ramo_id && (
              <div className="py-4">
                <PolicyHistoryTimeline
                  clientId={clientId}
                  ramoId={policy.ramo_id}
                  currentPolicyId={policy.id}
                  userId={userId}
                />
              </div>
            )}
          </div>

          {/* Footer: Download pill */}
          {canDownload && (
            <div className="px-6 py-5 border-t border-muted/30">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-[#1A1C1E] text-white font-medium text-base py-4 rounded-full shadow-lg active:shadow-md transition-shadow"
              >
                {policy.pdf_url && !policy.pdf_attached_data ? (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Abrir PDF
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Baixar Apólice
                  </>
                )}
              </motion.button>
            </div>
          )}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
