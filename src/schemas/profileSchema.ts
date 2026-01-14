
import { z } from 'zod';

export const profileSchema = z.object({
  nome_completo: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório'),
  
  telefone: z
    .string()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone deve estar no formato (XX) XXXXX-XXXX')
    .optional()
    .or(z.literal('')),

  birthday_message_template: z
    .string()
    .max(500, 'Template deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal(''))
});

export type ProfileFormData = z.infer<typeof profileSchema>;
