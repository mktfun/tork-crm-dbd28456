import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CRMStage, useCRMStages, PRESET_COLORS } from '@/hooks/useCRMDeals';

interface StageEditModalProps {
  stage: CRMStage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StageEditModal({ stage, open, onOpenChange }: StageEditModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { updateStage, deleteStage } = useCRMStages();

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setColor(stage.color);
    }
  }, [stage]);

  const handleSave = () => {
    if (!stage || !name.trim()) return;
    
    updateStage.mutate(
      { id: stage.id, name: name.trim(), color },
      {
        onSuccess: () => {
          onOpenChange(false);
        }
      }
    );
  };

  const handleDelete = () => {
    if (!stage) return;
    
    deleteStage.mutate(stage.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onOpenChange(false);
      },
      onError: () => {
        setShowDeleteConfirm(false);
      }
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setShowDeleteConfirm(false);
  };

  if (!stage) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="glass-component border-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
            <DialogDescription>
              Altere o nome ou a cor desta etapa do funil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-stage-name">Nome da Etapa</Label>
              <Input
                id="edit-stage-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary/30"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <motion.button
                    key={c}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      h-9 w-9 rounded-full transition-all duration-200
                      ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : 'hover:opacity-80'}
                    `}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="pt-2">
              <Label className="text-muted-foreground text-xs">Preview</Label>
              <div 
                className="mt-2 glass-component rounded-lg p-3 border-t-4"
                style={{ borderTopColor: color }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-foreground">{name || stage.name}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              className="sm:mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!name.trim() || updateStage.isPending}
            >
              {updateStage.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="glass-component border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Etapa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a etapa "{stage.name}"? 
              <br /><br />
              <strong className="text-foreground">Atenção:</strong> Esta etapa só pode ser excluída se não houver negócios vinculados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteStage.isPending}
            >
              {deleteStage.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
