-- EXECUTE ESTE SQL NO PAINEL DO SUPABASE (SQL Editor)
-- Para corrigir o problema de multi-tenant nos relatórios

-- Remover políticas problemáticas que dependem de auth.uid()
DROP POLICY IF EXISTS "Condominios do usuario logado" ON public.condominios;
DROP POLICY IF EXISTS "Funcionarios do mesmo condominio" ON public.funcionarios;
DROP POLICY IF EXISTS "Moradores do condominio do usuario logado" ON public.moradores;
DROP POLICY IF EXISTS "Entregas do condominio do usuario logado" ON public.entregas;
DROP POLICY IF EXISTS "Criar entregas para o condominio do usuario logado" ON public.entregas;
DROP POLICY IF EXISTS "Atualizar entregas do condominio do usuario logado" ON public.entregas;

-- Criar políticas permissivas (o filtro por condominio_id é feito no código)
CREATE POLICY "Funcionarios podem fazer login" 
ON public.funcionarios 
FOR SELECT 
USING (true);

CREATE POLICY "Funcionarios podem ver condominios" 
ON public.condominios 
FOR SELECT 
USING (true);

CREATE POLICY "Funcionarios podem ver moradores" 
ON public.moradores 
FOR SELECT 
USING (true);

CREATE POLICY "Funcionarios podem ver entregas" 
ON public.entregas 
FOR SELECT 
USING (true);

CREATE POLICY "Funcionarios podem criar entregas" 
ON public.entregas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Funcionarios podem atualizar entregas" 
ON public.entregas 
FOR UPDATE 
USING (true);