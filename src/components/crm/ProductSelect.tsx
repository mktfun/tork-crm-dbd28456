import { useProducts } from '@/hooks/useProducts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package } from 'lucide-react';

interface ProductSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function ProductSelect({ value, onValueChange }: ProductSelectProps) {
  const { activeProducts, isLoading } = useProducts();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Carregando...' : 'Selecione o produto'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">Nenhum produto</span>
        </SelectItem>
        {activeProducts.map((product) => (
          <SelectItem key={product.id} value={product.id}>
            <div className="flex items-center gap-2">
              {product.icon ? (
                <span className="text-sm">{product.icon}</span>
              ) : (
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span style={{ color: product.color || 'inherit' }}>{product.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
