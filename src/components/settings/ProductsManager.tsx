import { useState } from 'react';
import { useProducts, type CRMProduct } from '@/hooks/useProducts';
import { ProductDialog } from './ProductDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormCard } from '@/components/ui/form-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, MoreHorizontal, Pencil, Trash2, ToggleLeft, Loader2, Package } from 'lucide-react';

export function ProductsManager() {
  const { products, isLoading, createProduct, updateProduct, deleteProduct } = useProducts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CRMProduct | null>(null);

  const handleCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product: CRMProduct) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleSave = async (data: { name: string; description?: string; color?: string; icon?: string; is_active?: boolean }) => {
    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
    } else {
      await createProduct.mutateAsync(data);
    }
  };

  const handleToggleActive = async (product: CRMProduct) => {
    await updateProduct.mutateAsync({ id: product.id, is_active: !product.is_active });
  };

  const handleDelete = async (product: CRMProduct) => {
    if (!confirm(`Deseja realmente excluir "${product.name}"?`)) return;
    await deleteProduct.mutateAsync(product.id);
  };

  return (
    <div className="space-y-6">
      <FormCard
        title="Produtos / Ramos"
        description="Gerencie os produtos e ramos de seguro disponíveis para negociações no CRM."
      >
        <div className="flex justify-end mb-4">
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum produto cadastrado ainda.</p>
            <Button onClick={handleCreate} variant="outline" size="sm" className="mt-3">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar primeiro produto
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {product.icon ? (
                          <span className="text-lg">{product.icon}</span>
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span style={{ color: product.color || 'inherit' }}>{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                      {product.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'default' : 'secondary'} className="text-xs">
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                            <ToggleLeft className="h-4 w-4 mr-2" />
                            {product.is_active ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(product)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </FormCard>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSave={handleSave}
      />
    </div>
  );
}
