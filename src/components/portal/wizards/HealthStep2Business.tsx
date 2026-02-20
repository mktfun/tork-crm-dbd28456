import * as React from "react";
import { Building2, Loader2, CheckCircle2, GraduationCap, User } from "lucide-react";
import type { HealthWizardData } from "../HealthWizard";
import { formatCNPJ, isValidCNPJ } from "@/utils/cnpjApi";

interface Props {
  data: HealthWizardData;
  saveData: (data: Partial<HealthWizardData>) => void;
  isFetchingCNPJ: boolean;
  onCNPJBlur: () => void;
}

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const educationLevels = [
  { value: 'fundamental', label: 'Ensino Fundamental' },
  { value: 'medio', label: 'Ensino Médio' },
  { value: 'superior', label: 'Ensino Superior' },
  { value: 'pos', label: 'Pós-graduação' },
  { value: 'mestrado', label: 'Mestrado/Doutorado' },
];

const relationshipLabels: Record<string, string> = {
  holder: 'Titular',
  spouse: 'Cônjuge',
  child: 'Filho(a)',
  parent: 'Pai/Mãe',
  employee: 'Funcionário',
  other: 'Outro',
};

export const HealthStep2Business: React.FC<Props> = ({ 
  data, 
  saveData, 
  isFetchingCNPJ, 
  onCNPJBlur 
}) => {
  const cnpjValid = isValidCNPJ(data.cnpj);

  // Helper para atualizar CPF/educação de uma vida específica
  const updateLife = (lifeId: string, field: 'cpf' | 'educationLevel', value: string) => {
    const updatedLives = data.lives.map(life => {
      if (life.id === lifeId) {
        return { ...life, [field]: value };
      }
      return life;
    });
    saveData({ lives: updatedLives });
  };

  const switchToCPF = () => {
    saveData({ contractType: 'cpf' });
  };

  const switchToCNPJ = () => {
    saveData({ contractType: 'cnpj' });
  };

  return (
    <div className="space-y-6">
      {/* MODO CNPJ (Default - Empresarial) */}
      {data.contractType === 'cnpj' && (
        <>
          {/* Header CNPJ */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              Dados para Contratação
            </h2>
            <p className="text-muted-foreground">
              Informe o CNPJ para vincular o plano.
            </p>
          </div>

          <div className="space-y-4">
            {/* CNPJ Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                CNPJ <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.cnpj}
                  onChange={(e) => saveData({ cnpj: formatCNPJ(e.target.value) })}
                  onBlur={onCNPJBlur}
                  placeholder="00.000.000/0000-00"
                  className={`
                    w-full h-12 px-4 pr-10 rounded-xl border-2 bg-background
                    font-mono text-base tracking-wide
                    focus:outline-none focus:ring-4 transition-all duration-200
                    ${cnpjValid && data.razaoSocial
                      ? 'border-success focus:ring-success/10 focus:border-success'
                      : 'border-input focus:ring-primary/10 focus:border-primary'
                    }
                  `}
                />
                {isFetchingCNPJ && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
                )}
                {!isFetchingCNPJ && cnpjValid && data.razaoSocial && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-success" />
                )}
              </div>
            </div>

            {/* Razão Social (preenchida automaticamente) */}
            {data.razaoSocial && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Razão Social
                </label>
                <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{data.razaoSocial}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Empresa encontrada • {data.livesCount} {data.livesCount === 1 ? 'vida' : 'vidas'} a cotar
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Link discreto para PF */}
            <div className="pt-4 border-t border-border">
              <button
                type="button"
                onClick={switchToCPF}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-2"
              >
                <User className="w-4 h-4 inline-block mr-1.5" />
                Não tenho CNPJ (contratar como Pessoa Física)
              </button>
            </div>
          </div>
        </>
      )}

      {/* MODO CPF (Pessoa Física) - Coleta CPF e Escolaridade para cada vida */}
      {data.contractType === 'cpf' && (
        <>
          {/* Header CPF */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
              <User className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              Dados para Contratação
            </h2>
            <p className="text-muted-foreground">
              Informe os dados de cada beneficiário.
            </p>
          </div>

          <div className="space-y-4">
            {/* Lista de vidas com CPF e Escolaridade */}
            {data.lives.map((life, index) => {
              const isValidCPF = life.cpf && life.cpf.replace(/\D/g, '').length === 11;
              
              return (
                <div 
                  key={life.id}
                  className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-4"
                >
                  {/* Cabeçalho da vida */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {relationshipLabels[life.relationship] || 'Beneficiário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {life.age} anos
                      </p>
                    </div>
                  </div>

                  {/* CPF */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      CPF <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={life.cpf || ''}
                        onChange={(e) => updateLife(life.id, 'cpf', formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className={`
                          w-full h-12 px-4 rounded-xl border-2 bg-background
                          font-mono text-base tracking-wide
                          focus:outline-none focus:ring-4 transition-all duration-200
                          ${isValidCPF
                            ? 'border-success focus:ring-success/10 focus:border-success'
                            : 'border-input focus:ring-primary/10 focus:border-primary'
                          }
                        `}
                      />
                      {isValidCPF && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-success" />
                      )}
                    </div>
                  </div>

                  {/* Escolaridade */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      Escolaridade
                    </label>
                    <select
                      value={life.educationLevel || ''}
                      onChange={(e) => updateLife(life.id, 'educationLevel', e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border-2 border-input bg-background
                        text-base appearance-none cursor-pointer
                        focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary
                        transition-all duration-200"
                    >
                      <option value="">Selecione...</option>
                      {educationLevels.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}

            <p className="text-xs text-muted-foreground text-center">
              Algumas categorias profissionais e níveis de escolaridade têm acesso a planos diferenciados.
            </p>

            {/* Link discreto para voltar ao CNPJ */}
            <div className="pt-4 border-t border-border">
              <button
                type="button"
                onClick={switchToCNPJ}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-2"
              >
                <Building2 className="w-4 h-4 inline-block mr-1.5" />
                Tenho CNPJ (contratar como empresa)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
