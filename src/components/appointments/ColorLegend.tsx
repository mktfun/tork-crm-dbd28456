
import { Circle } from 'lucide-react';

export function ColorLegend() {
  const colors = [
    { label: 'Pendente', color: 'bg-blue-500', textColor: 'text-blue-400' },
    { label: 'Realizado', color: 'bg-green-500', textColor: 'text-green-400' },
    { label: 'Cancelado', color: 'bg-red-500', textColor: 'text-red-400' },
    { label: 'Atrasado', color: 'bg-gray-500', textColor: 'text-gray-400' }
  ];

  return (
    <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
      <h4 className="text-xs font-medium text-white/70 mb-2 uppercase tracking-wider">
        Legenda de Cores
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {colors.map((color, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color.color}`} />
            <span className={`text-xs ${color.textColor}`}>
              {color.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
