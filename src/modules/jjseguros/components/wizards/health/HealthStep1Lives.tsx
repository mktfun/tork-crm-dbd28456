import * as React from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { HealthWizardData } from "../HealthWizard";

interface Props {
  data: HealthWizardData;
  saveData: (data: Partial<HealthWizardData>) => void;
}

const relationships = [
  { value: 'holder', label: 'Titular' },
  { value: 'spouse', label: 'Cônjuge' },
  { value: 'child', label: 'Filho(a)' },
  { value: 'parent', label: 'Pai/Mãe' },
  { value: 'employee', label: 'Funcionário' },
  { value: 'other', label: 'Outro' },
];

export const HealthStep1Lives: React.FC<Props> = ({ data, saveData }) => {
  const addLife = () => {
    const newLife = {
      id: Date.now().toString(),
      age: '',
      relationship: 'other',
    };
    saveData({
      lives: [...data.lives, newLife],
      livesCount: data.livesCount + 1,
    });
  };

  const removeLife = (id: string) => {
    if (data.lives.length <= 1) return;
    saveData({
      lives: data.lives.filter(l => l.id !== id),
      livesCount: Math.max(1, data.livesCount - 1),
    });
  };

  const updateLife = (id: string, field: 'age' | 'relationship', value: string) => {
    saveData({
      lives: data.lives.map(l =>
        l.id === id ? { ...l, [field]: value } : l
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Quantas vidas?
        </h2>
        <p className="text-muted-foreground">
          Informe a idade de cada pessoa que será incluída no plano.
        </p>
      </div>

      {/* Lives Grid */}
      <div className="space-y-4">
        {data.lives.map((life, index) => (
          <motion.div
            key={life.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50"
          >
            {/* Número */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">{index + 1}</span>
            </div>

            {/* Idade */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Idade
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="120"
                value={life.age}
                onChange={(e) => updateLife(life.id, 'age', e.target.value)}
                placeholder="Ex: 35"
                className="w-full h-11 px-4 rounded-lg border-2 border-input bg-background
                  text-base font-medium
                  focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary
                  transition-all duration-200"
              />
            </div>

            {/* Parentesco */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Parentesco
              </label>
              <select
                value={life.relationship}
                onChange={(e) => updateLife(life.id, 'relationship', e.target.value)}
                className="w-full h-11 px-4 rounded-lg border-2 border-input bg-background
                  text-base appearance-none cursor-pointer
                  focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary
                  transition-all duration-200"
              >
                {relationships.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Remove Button */}
            {data.lives.length > 1 && (
              <button
                type="button"
                onClick={() => removeLife(life.id)}
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                  text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={addLife}
        className="w-full flex items-center justify-center gap-2 py-3 
          rounded-xl border-2 border-dashed border-primary/30
          text-primary font-medium
          hover:bg-primary/5 hover:border-primary/50
          transition-all duration-200"
      >
        <Plus className="w-5 h-5" />
        Adicionar pessoa
      </button>

      {/* Summary */}
      <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-sm text-muted-foreground">
          Total de vidas: <span className="font-semibold text-primary">{data.lives.length}</span>
        </p>
      </div>
    </div>
  );
};
