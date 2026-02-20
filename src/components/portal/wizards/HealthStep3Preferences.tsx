import * as React from "react";
import { Wallet, Building, BedDouble, MapPin } from "lucide-react";
import type { HealthWizardData } from "./HealthWizard";
import { brazilianStatesWithCities, getCitiesByState } from "@/utils/brazilianCities";

interface Props {
  data: HealthWizardData;
  saveData: (data: Partial<HealthWizardData>) => void;
}

export const HealthStep3Preferences: React.FC<Props> = ({ data, saveData }) => {
  const availableCities = data.state ? getCitiesByState(data.state) : [];

  const handleStateChange = (newState: string) => {
    // Reset city when state changes
    saveData({ state: newState, city: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
          <Wallet className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Suas Preferências
        </h2>
        <p className="text-muted-foreground">
          Nos ajude a encontrar o plano ideal para você.
        </p>
      </div>

      {/* Budget Slider */}
      <div className="space-y-3">
        <label className="flex items-center justify-between text-sm font-medium text-foreground">
          <span className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Orçamento mensal por pessoa
          </span>
          <span className="text-primary font-semibold">
            R$ {data.budget.toLocaleString('pt-BR')}
          </span>
        </label>
        
        <div className="relative pt-2 pb-4">
          <input
            type="range"
            min="200"
            max="3000"
            step="50"
            value={data.budget}
            onChange={(e) => saveData({ budget: parseInt(e.target.value) })}
            className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>R$ 200</span>
            <span>R$ 3.000</span>
          </div>
        </div>
      </div>

      {/* State Selector */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          Estado (UF)
        </label>
        <select
          value={data.state}
          onChange={(e) => handleStateChange(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border-2 border-input bg-background
            text-base appearance-none cursor-pointer
            focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary
            transition-all duration-200"
        >
          <option value="">Selecione seu estado...</option>
          {brazilianStatesWithCities.map(state => (
            <option key={state.value} value={state.value}>
              {state.label} - {state.value}
            </option>
          ))}
        </select>
      </div>

      {/* City Selector - Appears after state is selected */}
      {data.state && availableCities.length > 0 && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            Cidade
          </label>
          <select
            value={data.city || ''}
            onChange={(e) => saveData({ city: e.target.value })}
            className="w-full h-12 px-4 rounded-xl border-2 border-input bg-background
              text-base appearance-none cursor-pointer
              focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary
              transition-all duration-200"
          >
            <option value="">Selecione sua cidade...</option>
            {availableCities.map(city => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Network Preference - Input livre (opcional) */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Building className="w-4 h-4 text-primary" />
          Hospital ou rede de preferência (opcional)
        </label>
        <input
          type="text"
          value={data.networkPreference}
          onChange={(e) => saveData({ networkPreference: e.target.value })}
          placeholder="Ex: Albert Einstein, Rede D'Or, Unimed..."
          className="w-full h-12 px-4 rounded-xl border-2 border-input bg-background
            text-base
            focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary
            transition-all duration-200"
        />
      </div>

      {/* Accommodation Type */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BedDouble className="w-4 h-4 text-primary" />
          Tipo de acomodação
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => saveData({ accommodation: 'enfermaria' })}
            className={`
              flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200
              ${data.accommodation === 'enfermaria'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
              }
            `}
          >
            <span className="font-medium text-foreground">Enfermaria</span>
            <span className="text-xs text-muted-foreground">Quarto compartilhado</span>
          </button>
          
          <button
            type="button"
            onClick={() => saveData({ accommodation: 'apartamento' })}
            className={`
              flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200
              ${data.accommodation === 'apartamento'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
              }
            `}
          >
            <span className="font-medium text-foreground">Apartamento</span>
            <span className="text-xs text-muted-foreground">Quarto individual</span>
          </button>
        </div>
      </div>
    </div>
  );
};
