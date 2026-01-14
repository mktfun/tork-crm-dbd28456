
import { useState, useEffect } from 'react';

// Este hook pega um valor que muda rapidamente (como o texto de um input)
// e só retorna o valor final depois que o usuário para de digitar por um tempo (delay)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Isso limpa o timer se o usuário digitar de novo antes do delay acabar
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
