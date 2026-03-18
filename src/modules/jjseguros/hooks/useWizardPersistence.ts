import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY_PREFIX = 'jj_wizard_';
const EXPIRY_HOURS = 24;

export interface WizardPersistenceOptions<T> {
  key: string;
  initialData: T;
  onRestore?: (data: T) => void;
}

export function useWizardPersistence<T extends object>({
  key,
  initialData,
  onRestore,
}: WizardPersistenceOptions<T>) {
  const storageKey = `${STORAGE_KEY_PREFIX}${key}`;
  const isRestoredRef = useRef(false);

  // Inicializar estado com dados do LocalStorage se existirem
  const [data, setData] = useState<T>(() => {
    if (typeof window === 'undefined') return initialData;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const { data: savedData, timestamp } = parsed;
        
        // Verificar se expirou (24h)
        const expiryTime = EXPIRY_HOURS * 60 * 60 * 1000;
        if (Date.now() - timestamp < expiryTime) {
          return { ...initialData, ...savedData };
        } else {
          // Expirado, limpar
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('Erro ao restaurar dados do wizard:', error);
    }
    
    return initialData;
  });

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const expiryTime = EXPIRY_HOURS * 60 * 60 * 1000;
        if (Date.now() - parsed.timestamp < expiryTime) {
          return parsed.step || 0;
        }
      }
    } catch {
      return 0;
    }
    return 0;
  });

  // Callback onRestore apenas uma vez
  useEffect(() => {
    if (!isRestoredRef.current && onRestore) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          const expiryTime = EXPIRY_HOURS * 60 * 60 * 1000;
          if (Date.now() - parsed.timestamp < expiryTime && parsed.data) {
            onRestore(parsed.data);
          }
        }
      } catch {
        // Ignora erros
      }
      isRestoredRef.current = true;
    }
  }, [storageKey, onRestore]);

  // Salvar no LocalStorage quando dados mudam
  const saveData = useCallback((newData: Partial<T>, step?: number) => {
    setData(prev => {
      const updated = { ...prev, ...newData };
      
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          data: updated,
          step: step ?? currentStep,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.warn('Erro ao salvar dados do wizard:', error);
      }
      
      return updated;
    });
  }, [storageKey, currentStep]);

  // Atualizar step
  const updateStep = useCallback((step: number) => {
    setCurrentStep(step);
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem(storageKey, JSON.stringify({
          ...parsed,
          step,
          timestamp: Date.now(),
        }));
      }
    } catch {
      // Ignora
    }
  }, [storageKey]);

  // Limpar dados (após submit com sucesso)
  const clearData = useCallback(() => {
    localStorage.removeItem(storageKey);
    setData(initialData);
    setCurrentStep(0);
  }, [storageKey, initialData]);

  // Verificar se tem dados salvos
  const hasPersistedData = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const expiryTime = EXPIRY_HOURS * 60 * 60 * 1000;
        return Date.now() - parsed.timestamp < expiryTime;
      }
    } catch {
      return false;
    }
    return false;
  }, [storageKey]);

  return {
    data,
    currentStep,
    saveData,
    updateStep,
    clearData,
    hasPersistedData,
  };
}
