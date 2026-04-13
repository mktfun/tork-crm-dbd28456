import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Repeat } from 'lucide-react';

interface RecurrenceConfigProps {
  onRecurrenceChange: (rule: string | null) => void;
  inline?: boolean;
}

const RecurrenceConfig = ({ onRecurrenceChange, inline }: RecurrenceConfigProps) => {
  const [freq, setFreq] = useState('none');
  const [interval, setInterval] = useState(1);

  useEffect(() => {
    if (freq === 'none') {
      onRecurrenceChange(null);
      return;
    }
    const int = Math.max(1, interval);
    const freqMap: { [key: string]: string } = {
      daily: 'DAILY',
      weekly: 'WEEKLY',
      monthly: 'MONTHLY',
      yearly: 'YEARLY',
    };
    const rule = `FREQ=${freqMap[freq]};INTERVAL=${int}`;
    onRecurrenceChange(rule);
  }, [freq, interval, onRecurrenceChange]);

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setInterval(isNaN(value) || value < 1 ? 1 : value);
  };

  const getIntervalLabel = () => {
    if (freq === 'none') return '';
    const labels: { [key: string]: string } = {
      daily: interval > 1 ? 'dias' : 'dia',
      weekly: interval > 1 ? 'semanas' : 'semana',
      monthly: interval > 1 ? 'meses' : 'mês',
      yearly: interval > 1 ? 'anos' : 'ano',
    };
    return labels[freq];
  };

  if (inline) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-sm text-foreground/80">
            <Repeat className="w-4 h-4 text-muted-foreground" />
            Recorrência
          </span>
          <Select value={freq} onValueChange={setFreq}>
            <SelectTrigger className="w-[150px] border-0 bg-transparent shadow-none focus:ring-0 text-right text-muted-foreground text-sm h-auto py-0 px-0 justify-end gap-1.5 [&>svg]:text-muted-foreground/50">
              <SelectValue placeholder="Não repetir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não repetir</SelectItem>
              <SelectItem value="daily">Diariamente</SelectItem>
              <SelectItem value="weekly">Semanalmente</SelectItem>
              <SelectItem value="monthly">Mensalmente</SelectItem>
              <SelectItem value="yearly">Anualmente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {freq !== 'none' && (
          <div className="flex items-center gap-2 pl-7 text-sm">
            <span className="text-muted-foreground">a cada</span>
            <Input
              type="number"
              value={interval}
              onChange={handleIntervalChange}
              className="w-14 text-center border-0 bg-muted/30 rounded-lg text-foreground text-sm h-8 shadow-none focus-visible:ring-1 focus-visible:ring-primary/30 px-1"
              min="1"
            />
            <span className="text-muted-foreground">{getIntervalLabel()}</span>
          </div>
        )}
      </div>
    );
  }

  // Legacy layout (non-inline)
  return (
    <div className="space-y-2">
      <span className="text-sm text-muted-foreground">Recorrência</span>
      <div className="flex items-center gap-2">
        <Select value={freq} onValueChange={setFreq}>
          <SelectTrigger>
            <SelectValue placeholder="Repetir..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não repetir</SelectItem>
            <SelectItem value="daily">Diariamente</SelectItem>
            <SelectItem value="weekly">Semanalmente</SelectItem>
            <SelectItem value="monthly">Mensalmente</SelectItem>
            <SelectItem value="yearly">Anualmente</SelectItem>
          </SelectContent>
        </Select>

        {freq !== 'none' && (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-muted-foreground text-sm">a cada</span>
            <Input
              type="number"
              value={interval}
              onChange={handleIntervalChange}
              className="w-16 text-center"
              min="1"
            />
            <span className="text-muted-foreground text-sm">{getIntervalLabel()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurrenceConfig;
