-- Criar políticas para permitir inserção e atualização de moradores
-- Política para inserção de moradores (funcionários e síndicos podem cadastrar)
CREATE POLICY "Funcionarios podem inserir moradores" 
ON public.moradores 
FOR INSERT 
WITH CHECK (true);

-- Política para atualização de moradores 
CREATE POLICY "Funcionarios podem atualizar moradores" 
ON public.moradores 
FOR UPDATE 
USING (true);

-- Política para deleção de moradores (apenas para casos necessários)
CREATE POLICY "Funcionarios podem deletar moradores" 
ON public.moradores 
FOR DELETE 
USING (true);