import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LgpdConsentProps {
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  onAcceptTermsChange: (checked: boolean) => void;
  onAcceptPrivacyChange: (checked: boolean) => void;
  className?: string;
}

export function LgpdConsent({
  acceptedTerms,
  acceptedPrivacy,
  onAcceptTermsChange,
  onAcceptPrivacyChange,
  className,
}: LgpdConsentProps) {
  return (
    <div className={cn("space-y-3 rounded-xl border border-border bg-card/50 p-4", className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Consentimento LGPD</p>
      <div className="flex items-start gap-3">
        <Checkbox
          id="terms"
          checked={acceptedTerms}
          onCheckedChange={(c) => onAcceptTermsChange(c === true)}
        />
        <Label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
          Aceito os <span className="text-foreground underline">Termos de Uso</span> e autorizo o tratamento dos meus dados.
        </Label>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox
          id="privacy"
          checked={acceptedPrivacy}
          onCheckedChange={(c) => onAcceptPrivacyChange(c === true)}
        />
        <Label htmlFor="privacy" className="text-sm text-muted-foreground leading-snug cursor-pointer">
          Li e concordo com a <span className="text-foreground underline">Política de Privacidade</span>.
        </Label>
      </div>
    </div>
  );
}
