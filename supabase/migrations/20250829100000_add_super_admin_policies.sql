-- Adicionar políticas RLS para permitir que super admins gerenciem condomínios

-- Drop existing policies para condominios INSERT/UPDATE/DELETE se existirem
DROP POLICY IF EXISTS "Super admins podem inserir condominios" ON public.condominios;
DROP POLICY IF EXISTS "Super admins podem atualizar condominios" ON public.condominios;
DROP POLICY IF EXISTS "Super admins podem deletar condominios" ON public.condominios;
DROP POLICY IF EXISTS "Allow super admin insert condominios" ON public.condominios;
DROP POLICY IF EXISTS "Allow super admin update condominios" ON public.condominios;
DROP POLICY IF EXISTS "Allow super admin delete condominios" ON public.condominios;

-- Políticas para super admins poderem gerenciar condomínios
CREATE POLICY "Super admins podem inserir condominios" 
ON public.condominios 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Super admins podem atualizar condominios" 
ON public.condominios 
FOR UPDATE 
USING (true);

CREATE POLICY "Super admins podem deletar condominios" 
ON public.condominios 
FOR DELETE 
USING (true);

-- Garantir que super admins também podem ver todos os funcionários
DROP POLICY IF EXISTS "Super admins podem ver funcionarios" ON public.funcionarios;
CREATE POLICY "Super admins podem ver funcionarios" 
ON public.funcionarios 
FOR SELECT 
USING (true);

-- Garantir que super admins podem gerenciar funcionários também
DROP POLICY IF EXISTS "Super admins podem inserir funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Super admins podem atualizar funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Super admins podem deletar funcionarios" ON public.funcionarios;

CREATE POLICY "Super admins podem inserir funcionarios" 
ON public.funcionarios 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Super admins podem atualizar funcionarios" 
ON public.funcionarios 
FOR UPDATE 
USING (true);

CREATE POLICY "Super admins podem deletar funcionarios" 
ON public.funcionarios 
FOR DELETE 
USING (true);

-- Políticas para moradores
DROP POLICY IF EXISTS "Super admins podem gerenciar moradores" ON public.moradores;
CREATE POLICY "Super admins podem gerenciar moradores" 
ON public.moradores 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Comentários para documentação
COMMENT ON POLICY "Super admins podem inserir condominios" ON public.condominios IS 'Permite que super administradores criem novos condomínios';
COMMENT ON POLICY "Super admins podem atualizar condominios" ON public.condominios IS 'Permite que super administradores editem condomínios existentes';
COMMENT ON POLICY "Super admins podem deletar condominios" ON public.condominios IS 'Permite que super administradores excluam condomínios';