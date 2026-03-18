import * as React from "react";
import { Phone, User, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import type { HealthWizardData } from "../HealthWizard";

interface Props {
  data: HealthWizardData;
  saveData: (data: Partial<HealthWizardData>) => void;
}

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const HealthStep4Contact: React.FC<Props> = ({ data, saveData }) => {
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validations = {
    name: data.name.trim().length >= 3,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
    phone: data.phone.replace(/\D/g, '').length >= 10,
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
          <Phone className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Seus Dados de Contato
        </h2>
        <p className="text-muted-foreground">
          Para enviarmos as melhores opções de planos.
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
            <User className="w-4 h-4 text-primary" />
            Nome Completo <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={data.name}
              onChange={(e) => saveData({ name: e.target.value })}
              onBlur={() => handleBlur('name')}
              placeholder="Seu nome completo"
              className={`
                w-full h-12 px-4 pr-10 rounded-xl border-2 bg-background
                text-base
                focus:outline-none focus:ring-4 transition-all duration-200
                ${touched.name && !validations.name
                  ? 'border-destructive focus:ring-destructive/10'
                  : validations.name
                    ? 'border-success focus:ring-success/10'
                    : 'border-input focus:ring-primary/10 focus:border-primary'
                }
              `}
            />
            {validations.name && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-success" />
            )}
            {touched.name && !validations.name && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
            )}
          </div>
          {touched.name && !validations.name && (
            <p className="mt-1 text-xs text-destructive">Nome deve ter pelo menos 3 caracteres</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
            <Mail className="w-4 h-4 text-primary" />
            E-mail <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              inputMode="email"
              value={data.email}
              onChange={(e) => saveData({ email: e.target.value })}
              onBlur={() => handleBlur('email')}
              placeholder="seu@email.com"
              className={`
                w-full h-12 px-4 pr-10 rounded-xl border-2 bg-background
                text-base
                focus:outline-none focus:ring-4 transition-all duration-200
                ${touched.email && !validations.email
                  ? 'border-destructive focus:ring-destructive/10'
                  : validations.email
                    ? 'border-success focus:ring-success/10'
                    : 'border-input focus:ring-primary/10 focus:border-primary'
                }
              `}
            />
            {validations.email && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-success" />
            )}
            {touched.email && !validations.email && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
            )}
          </div>
          {touched.email && !validations.email && (
            <p className="mt-1 text-xs text-destructive">E-mail inválido</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
            <Phone className="w-4 h-4 text-primary" />
            Celular <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              inputMode="tel"
              value={data.phone}
              onChange={(e) => saveData({ phone: formatPhone(e.target.value) })}
              onBlur={() => handleBlur('phone')}
              placeholder="(00) 00000-0000"
              className={`
                w-full h-12 px-4 pr-10 rounded-xl border-2 bg-background
                font-mono text-base tracking-wide
                focus:outline-none focus:ring-4 transition-all duration-200
                ${touched.phone && !validations.phone
                  ? 'border-destructive focus:ring-destructive/10'
                  : validations.phone
                    ? 'border-success focus:ring-success/10'
                    : 'border-input focus:ring-primary/10 focus:border-primary'
                }
              `}
            />
            {validations.phone && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-success" />
            )}
            {touched.phone && !validations.phone && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
            )}
          </div>
          {touched.phone && !validations.phone && (
            <p className="mt-1 text-xs text-destructive">Telefone deve ter pelo menos 10 dígitos</p>
          )}
        </div>
      </div>

      {/* Privacy Note */}
      <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground">
          🔒 Seus dados estão protegidos e não serão compartilhados com terceiros.
        </p>
      </div>
    </div>
  );
};
