import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, subMonths, addDays, startOfDay, endOfDay } from 'date-fns';
import { X } from 'lucide-react';

import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PeriodType = 'created_at' | 'start_date' | 'expiration_date';

interface PolicyDateFilterBarProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
}

type ShortcutKey = 'this-month' | 'last-month' | 'next-30' | 'next-90';

const SHORTCUTS: { key: ShortcutKey; label: string }[] = [
  { key: 'this-month', label: 'Este Mês' },
  { key: 'last-month', label: 'Mês Passado' },
  { key: 'next-30', label: 'Próximos 30 dias' },
  { key: 'next-90', label: 'Próximos 90 dias' },
];

function getShortcutRange(key: ShortcutKey): DateRange {
  const now = new Date();
  switch (key) {
    case 'this-month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last-month': {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case 'next-30':
      return { from: startOfDay(now), to: endOfDay(addDays(now, 30)) };
    case 'next-90':
      return { from: startOfDay(now), to: endOfDay(addDays(now, 90)) };
  }
}

function detectActiveShortcut(range: DateRange | undefined): ShortcutKey | null {
  if (!range?.from || !range?.to) return null;
  for (const s of SHORTCUTS) {
    const r = getShortcutRange(s.key);
    if (
      r.from!.toDateString() === range.from.toDateString() &&
      r.to!.toDateString() === range.to.toDateString()
    ) {
      return s.key;
    }
  }
  return null;
}

export function PolicyDateFilterBar({
  dateRange,
  onDateRangeChange,
  periodType,
  onPeriodTypeChange,
}: PolicyDateFilterBarProps) {
  const activeShortcut = detectActiveShortcut(dateRange);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm p-3">
      {/* Period type select */}
      <Select value={periodType} onValueChange={(v) => onPeriodTypeChange(v as PeriodType)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at">Data de Cadastro</SelectItem>
          <SelectItem value="start_date">Início da Vigência</SelectItem>
          <SelectItem value="expiration_date">Fim da Vigência</SelectItem>
        </SelectContent>
      </Select>

      {/* Date range picker */}
      <DatePickerWithRange
        date={dateRange}
        onDateChange={onDateRangeChange}
      />

      {/* Shortcut buttons */}
      <div className="flex items-center gap-1.5">
        {SHORTCUTS.map((s) => (
          <Button
            key={s.key}
            variant="outline"
            size="sm"
            className={cn(
              'text-xs h-8',
              activeShortcut === s.key && 'bg-primary/10 border-primary/40 text-primary'
            )}
            onClick={() => onDateRangeChange(getShortcutRange(s.key))}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* Clear button */}
      {dateRange && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => onDateRangeChange(undefined)}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
