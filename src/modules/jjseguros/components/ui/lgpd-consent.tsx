import * as React from "react";
import { Checkbox } from "@/modules/jjseguros/components/ui/checkbox";
import { LegalModals } from "@/modules/jjseguros/components/LegalModals";

interface LgpdConsentProps {
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  onAcceptTermsChange: (checked: boolean) => void;
  onAcceptPrivacyChange: (checked: boolean) => void;
}

export const LgpdConsent = ({
  acceptedTerms,
  acceptedPrivacy,
  onAcceptTermsChange,
  onAcceptPrivacyChange,
}: LgpdConsentProps) => {
  const [showTerms, setShowTerms] = React.useState(false);
  const [showPrivacy, setShowPrivacy] = React.useState(false);

  return (
    <>
      <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => onAcceptTermsChange(checked === true)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <label htmlFor="terms" className="text-sm font-medium leading-tight cursor-pointer">
              Confirmo que os dados informados são verdadeiros e corretos.
            </label>
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-xs text-primary hover:underline block"
            >
              Ver Termos de Uso
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="privacy"
            checked={acceptedPrivacy}
            onCheckedChange={(checked) => onAcceptPrivacyChange(checked === true)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <label htmlFor="privacy" className="text-sm font-medium leading-tight cursor-pointer">
              Autorizo o uso dos meus dados para fins de cotação de seguros, conforme a Lei Geral de Proteção de Dados (LGPD).
            </label>
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="text-xs text-primary hover:underline block"
            >
              Ver Política de Privacidade
            </button>
          </div>
        </div>
      </div>

      <LegalModals
        showTerms={showTerms}
        showPrivacy={showPrivacy}
        onCloseTerms={() => setShowTerms(false)}
        onClosePrivacy={() => setShowPrivacy(false)}
      />
    </>
  );
};
