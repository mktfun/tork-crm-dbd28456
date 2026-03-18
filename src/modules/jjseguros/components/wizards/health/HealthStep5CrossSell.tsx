import * as React from "react";
import { Shield, Car, Heart, Calendar, Sparkles } from "lucide-react";
import type { HealthWizardData } from "../HealthWizard";

interface Props {
  data: HealthWizardData;
  saveData: (data: Partial<HealthWizardData>) => void;
}

export const HealthStep5CrossSell: React.FC<Props> = ({ data, saveData }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Seus Outros Seguros
        </h2>
        <p className="text-muted-foreground">
          Além do plano de saúde, você possui algum seguro que vence em breve?
        </p>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            Na renovação, conseguimos <span className="font-semibold text-primary">condições especiais</span>. 
            Se não tiver, cotamos sem compromisso!
          </p>
        </div>
      </div>

      {/* Auto Insurance Option */}
      <div 
        className={`
          p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
          ${data.hasAutoInsurance 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
          }
        `}
        onClick={() => saveData({ hasAutoInsurance: !data.hasAutoInsurance })}
      >
        <div className="flex items-start gap-4">
          <div className={`
            flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
            transition-all duration-200
            ${data.hasAutoInsurance 
              ? 'border-primary bg-primary' 
              : 'border-muted-foreground'
            }
          `}>
            {data.hasAutoInsurance && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Car className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">
                Tenho seguro auto renovando
              </h3>
            </div>
            
            {data.hasAutoInsurance && (
              <div className="mt-3 animate-in slide-in-from-top-1 duration-200">
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Data de vencimento
                </label>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={data.autoExpiry}
                    onChange={(e) => saveData({ autoExpiry: e.target.value })}
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background
                      text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                      transition-all duration-200"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Life Insurance Option */}
      <div 
        className={`
          p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
          ${data.hasLifeInsurance 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
          }
        `}
        onClick={() => saveData({ hasLifeInsurance: !data.hasLifeInsurance })}
      >
        <div className="flex items-start gap-4">
          <div className={`
            flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
            transition-all duration-200
            ${data.hasLifeInsurance 
              ? 'border-primary bg-primary' 
              : 'border-muted-foreground'
            }
          `}>
            {data.hasLifeInsurance && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">
                Tenho seguro de vida renovando
              </h3>
            </div>
            
            {data.hasLifeInsurance && (
              <div className="mt-3 animate-in slide-in-from-top-1 duration-200">
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Data de vencimento
                </label>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={data.lifeExpiry}
                    onChange={(e) => saveData({ lifeExpiry: e.target.value })}
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background
                      text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                      transition-all duration-200"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Want Other Quotes Option */}
      <div 
        className={`
          p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
          ${data.wantsOtherQuotes 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
          }
        `}
        onClick={() => saveData({ wantsOtherQuotes: !data.wantsOtherQuotes })}
      >
        <div className="flex items-start gap-4">
          <div className={`
            flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
            transition-all duration-200
            ${data.wantsOtherQuotes 
              ? 'border-primary bg-primary' 
              : 'border-muted-foreground'
            }
          `}>
            {data.wantsOtherQuotes && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              Quero cotar outros seguros
            </h3>
            <p className="text-sm text-muted-foreground">
              Sem compromisso - enviaremos opções por email
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center p-4 rounded-xl bg-muted/30">
        <p className="text-sm text-muted-foreground">
          💡 Enviaremos sua cotação de saúde e, se marcou interesse, 
          entraremos em contato sobre os outros seguros.
        </p>
      </div>
    </div>
  );
};
