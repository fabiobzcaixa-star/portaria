-- Remove existing broad RLS policies
DROP POLICY IF EXISTS "Funcionarios podem ver condominios" ON public.condominios;
DROP POLICY IF EXISTS "Funcionarios podem ver moradores" ON public.moradores;
DROP POLICY IF EXISTS "Funcionarios podem ver entregas" ON public.entregas;
DROP POLICY IF EXISTS "Funcionarios podem criar entregas" ON public.entregas;
DROP POLICY IF EXISTS "Funcionarios podem atualizar entregas" ON public.entregas;

-- Create new RLS policies to restrict access based on condominium_id

-- Policy for 'condominios' table
CREATE POLICY "Condominios do usuario logado" 
ON public.condominios 
FOR SELECT 
USING (id = (SELECT condominio_id FROM public.funcionarios WHERE id = auth.uid()));

-- Policy for 'funcionarios' table
-- Funcionarios can only see themselves or other funcionarios from their own condominium
CREATE POLICY "Funcionarios do mesmo condominio" 
ON public.funcionarios 
FOR SELECT 
USING (condominio_id = (SELECT condominio_id FROM public.funcionarios WHERE id = auth.uid()));

-- Policy for 'moradores' table
CREATE POLICY "Moradores do condominio do usuario logado" 
ON public.moradores 
FOR SELECT 
USING (condominio_id = (SELECT condominio_id FROM public.funcionarios WHERE id = auth.uid()));

-- Policies for 'entregas' table
CREATE POLICY "Entregas do condominio do usuario logado" 
ON public.entregas 
FOR SELECT 
USING (condominio_id = (SELECT condominio_id FROM public.funcionarios WHERE id = auth.uid()));

CREATE POLICY "Criar entregas para o condominio do usuario logado" 
ON public.entregas 
FOR INSERT 
WITH CHECK (condominio_id = (SELECT condominio_id FROM public.funcionarios WHERE id = auth.uid()));

CREATE POLICY "Atualizar entregas do condominio do usuario logado" 
ON public.entregas 
FOR UPDATE 
USING (condominio_id = (SELECT condominio_id FROM public.funcionarios WHERE id = auth.uid()));
