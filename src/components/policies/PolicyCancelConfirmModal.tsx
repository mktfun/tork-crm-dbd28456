
import React from 'react';
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
import { AlertTriangle } from 'lucide-react';
import { Policy } from '@/types';

interface PolicyCancelConfirmModalProps {
  policy: Policy | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PolicyCancelConfirmModal({ 
  policy, 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading = false 
}: PolicyCancelConfirmModalProps) {
  if (!policy) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Cancelar Apólice
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            Tem certeza que deseja cancelar a apólice{' '}
            <span className="font-semibold text-white">
              {policy.policyNumber || `Orçamento #${policy.id.slice(0, 8)}`}
            </span>
            ?
            <br />
            <br />
            Esta ação não pode ser desfeita. A apólice será marcada como "Cancelada" 
            e não poderá mais ser ativada ou renovada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
            Manter Apólice
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? 'Cancelando...' : 'Sim, Cancelar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
