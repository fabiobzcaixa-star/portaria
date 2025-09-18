-- Drop existing RLS policies
DROP POLICY IF EXISTS "Funcionarios podem ver seu condominio" ON public.condominios;
DROP POLICY IF EXISTS "Funcionarios podem ver a si mesmos" ON public.funcionarios;
DROP POLICY IF EXISTS "Funcionarios podem ver moradores do seu condominio" ON public.moradores;
DROP POLICY IF EXISTS "Funcionarios podem ver entregas do seu condominio" ON public.entregas;
DROP POLICY IF EXISTS "Funcionarios podem criar entregas" ON public.entregas;
DROP POLICY IF EXISTS "Funcionarios podem atualizar entregas do seu condominio" ON public.entregas;

-- Create new RLS policies that allow login for any registered funcionario
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

-- Add more test funcionarios for different condominios
-- First, check if condominios already exist
INSERT INTO public.condominios (nome, endereco, cidade, cep, telefone) 
SELECT 'Condomínio Solar', 'Rua do Sol, 456', 'São Paulo', '04567-890', '(11) 3456-7891'
WHERE NOT EXISTS (SELECT 1 FROM public.condominios WHERE nome = 'Condomínio Solar');

INSERT INTO public.condominios (nome, endereco, cidade, cep, telefone) 
SELECT 'Residencial Parque', 'Av. das Árvores, 789', 'São Paulo', '07890-123', '(11) 3456-7892'
WHERE NOT EXISTS (SELECT 1 FROM public.condominios WHERE nome = 'Residencial Parque');

-- Get the new condominio IDs and insert funcionarios
INSERT INTO public.funcionarios (cpf, nome, senha, cargo, condominio_id)
SELECT '98765432100', 'Maria Santos', '654321', 'porteiro', c.id
FROM public.condominios c
WHERE c.nome = 'Condomínio Solar'
AND NOT EXISTS (SELECT 1 FROM public.funcionarios WHERE cpf = '98765432100');

INSERT INTO public.funcionarios (cpf, nome, senha, cargo, condominio_id)
SELECT '11122233344', 'Pedro Oliveira', '789123', 'porteiro', c.id
FROM public.condominios c
WHERE c.nome = 'Residencial Parque'
AND NOT EXISTS (SELECT 1 FROM public.funcionarios WHERE cpf = '11122233344');
