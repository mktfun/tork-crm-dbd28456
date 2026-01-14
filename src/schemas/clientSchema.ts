
import { z } from 'zod';

// Helper function to validate CPF
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cleanCPF.charAt(10));
};

// Helper function to validate CNPJ
const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return digit2 === parseInt(cleanCNPJ.charAt(13));
};

// Helper function to validate phone
const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10 || cleanPhone.length === 11;
};

// Helper function to validate CEP
const validateCEP = (cep: string): boolean => {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
};

export const clientSchema = z.object({
  // Required fields
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[A-Za-zÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  
  // Email and phone are now optional individually, but we need at least one
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .optional()
    .refine((value) => {
      if (!value || value.trim() === '') return true;
      return validatePhone(value);
    }, 'Telefone deve ter 10 ou 11 dígitos')
    .or(z.literal('')),
  
  // Status field
  status: z.enum(['Ativo', 'Inativo']),
  
  // Optional fields with validation
  cpfCnpj: z.string()
    .optional()
    .refine((value) => {
      if (!value || value.trim() === '') return true;
      const clean = value.replace(/\D/g, '');
      if (clean.length === 11) return validateCPF(value);
      if (clean.length === 14) return validateCNPJ(value);
      return false;
    }, 'CPF ou CNPJ inválido'),
  
  birthDate: z.string()
    .optional()
    .refine((value) => {
      if (!value || value.trim() === '') return true;
      const date = new Date(value);
      const today = new Date();
      const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
      return date <= today && date >= hundredYearsAgo;
    }, 'Data de nascimento inválida'),
  
  maritalStatus: z.enum(['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', '']).optional(),
  
  profession: z.string()
    .max(50, 'Profissão deve ter no máximo 50 caracteres')
    .optional(),
  
  // Address fields
  cep: z.string()
    .optional()
    .refine((value) => {
      if (!value || value.trim() === '') return true;
      return validateCEP(value);
    }, 'CEP deve ter 8 dígitos'),
  
  address: z.string()
    .max(100, 'Endereço deve ter no máximo 100 caracteres')
    .optional(),
  
  number: z.string()
    .max(10, 'Número deve ter no máximo 10 caracteres')
    .optional(),
  
  complement: z.string()
    .max(50, 'Complemento deve ter no máximo 50 caracteres')
    .optional(),
  
  neighborhood: z.string()
    .max(50, 'Bairro deve ter no máximo 50 caracteres')
    .optional(),
  
  city: z.string()
    .max(50, 'Cidade deve ter no máximo 50 caracteres')
    .optional(),
  
  state: z.string()
    .max(2, 'Estado deve ter no máximo 2 caracteres')
    .optional(),
  
  observations: z.string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional()
}).refine((data) => {
  // Validação customizada: deve ter pelo menos email OU telefone
  const hasEmail = data.email && data.email.trim() !== '';
  const hasPhone = data.phone && data.phone.trim() !== '';
  return hasEmail || hasPhone;
}, {
  message: 'É obrigatório ter pelo menos email ou telefone',
  path: ['email'] // Mostra o erro no campo email
});

export type ClientFormData = z.infer<typeof clientSchema>;
