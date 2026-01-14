import { useState, useCallback } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface AttemptLog {
  timestamp: number;
  count: number;
  blockedUntil?: number;
}

export function useRateLimit(key: string, config: RateLimitConfig) {
  const [attempts, setAttempts] = useState<Map<string, AttemptLog>>(new Map());

  const checkRateLimit = useCallback((identifier: string = 'default'): boolean => {
    const now = Date.now();
    const attemptKey = `${key}_${identifier}`;
    const current = attempts.get(attemptKey);

    // Se está bloqueado, verificar se ainda está no período de bloqueio
    if (current?.blockedUntil && now < current.blockedUntil) {
      return false; // Bloqueado
    }

    // Se passou o período de bloqueio ou janela de tempo, resetar
    if (!current || (now - current.timestamp) > config.windowMs) {
      setAttempts(prev => new Map(prev.set(attemptKey, {
        timestamp: now,
        count: 1
      })));
      return true; // Permitido
    }

    // Incrementar tentativas
    const newCount = current.count + 1;
    
    if (newCount > config.maxAttempts) {
      // Bloquear por um período
      setAttempts(prev => new Map(prev.set(attemptKey, {
        ...current,
        count: newCount,
        blockedUntil: now + config.blockDurationMs
      })));
      return false; // Bloqueado
    }

    // Atualizar contador
    setAttempts(prev => new Map(prev.set(attemptKey, {
      ...current,
      count: newCount
    })));
    
    return true; // Permitido
  }, [key, config, attempts]);

  const getRemainingTime = useCallback((identifier: string = 'default'): number => {
    const now = Date.now();
    const attemptKey = `${key}_${identifier}`;
    const current = attempts.get(attemptKey);
    
    if (current?.blockedUntil && now < current.blockedUntil) {
      return Math.ceil((current.blockedUntil - now) / 1000);
    }
    
    return 0;
  }, [key, attempts]);

  const resetAttempts = useCallback((identifier: string = 'default') => {
    const attemptKey = `${key}_${identifier}`;
    setAttempts(prev => {
      const newMap = new Map(prev);
      newMap.delete(attemptKey);
      return newMap;
    });
  }, [key]);

  return {
    checkRateLimit,
    getRemainingTime,
    resetAttempts
  };
}