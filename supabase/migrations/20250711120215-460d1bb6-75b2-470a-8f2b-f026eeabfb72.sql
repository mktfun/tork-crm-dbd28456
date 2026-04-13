
-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  policy_id UUID REFERENCES public.apolices(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Realizado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction_types table
CREATE TABLE public.transaction_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  name TEXT NOT NULL,
  nature TEXT NOT NULL CHECK (nature IN ('GANHO', 'PERDA')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_branches table
CREATE TABLE public.company_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_branches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for appointments
CREATE POLICY "Users can view their own appointments" 
  ON public.appointments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments" 
  ON public.appointments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments" 
  ON public.appointments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments" 
  ON public.appointments 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for transaction_types
CREATE POLICY "Users can view their own transaction types" 
  ON public.transaction_types 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transaction types" 
  ON public.transaction_types 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction types" 
  ON public.transaction_types 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction types" 
  ON public.transaction_types 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for companies
CREATE POLICY "Users can view their own companies" 
  ON public.companies 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies" 
  ON public.companies 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" 
  ON public.companies 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" 
  ON public.companies 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for company_branches
CREATE POLICY "Users can view their own company branches" 
  ON public.company_branches 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company branches" 
  ON public.company_branches 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company branches" 
  ON public.company_branches 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company branches" 
  ON public.company_branches 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.handle_updated_at_appointments()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.handle_updated_at_transaction_types()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.handle_updated_at_companies()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.handle_updated_at_company_branches()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at_appointments();

CREATE TRIGGER update_transaction_types_updated_at
    BEFORE UPDATE ON public.transaction_types
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at_transaction_types();

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at_companies();

CREATE TRIGGER update_company_branches_updated_at
    BEFORE UPDATE ON public.company_branches
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at_company_branches();

-- Create indexes for better performance
CREATE INDEX idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_appointments_policy_id ON public.appointments(policy_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);

CREATE INDEX idx_transaction_types_user_id ON public.transaction_types(user_id);
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_company_branches_user_id ON public.company_branches(user_id);
CREATE INDEX idx_company_branches_company_id ON public.company_branches(company_id);

-- Enable realtime for all tables
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.transaction_types REPLICA IDENTITY FULL;
ALTER TABLE public.companies REPLICA IDENTITY FULL;
ALTER TABLE public.company_branches REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_types;
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_branches;
