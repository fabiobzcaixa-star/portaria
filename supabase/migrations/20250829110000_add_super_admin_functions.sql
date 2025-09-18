-- Função para criar condomínio como super admin (bypass RLS)
CREATE OR REPLACE FUNCTION create_condominio_as_super_admin(
  p_nome TEXT,
  p_endereco TEXT,
  p_cep TEXT,
  p_cidade TEXT,
  p_telefone TEXT DEFAULT NULL,
  p_sindico_nome TEXT DEFAULT NULL,
  p_sindico_cpf TEXT DEFAULT NULL,
  p_sindico_senha TEXT DEFAULT NULL,
  p_sindico_telefone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_condominio_id UUID;
  result JSON;
BEGIN
  -- Insert novo condomínio
  INSERT INTO public.condominios (
    nome, endereco, cep, cidade, telefone, 
    sindico_nome, sindico_cpf, sindico_senha, sindico_telefone
  ) VALUES (
    p_nome, p_endereco, p_cep, p_cidade, p_telefone,
    p_sindico_nome, p_sindico_cpf, p_sindico_senha, p_sindico_telefone
  ) RETURNING id INTO new_condominio_id;
  
  -- Retorna dados do condomínio criado
  SELECT json_build_object(
    'success', true,
    'id', new_condominio_id,
    'message', 'Condomínio criado com sucesso'
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, retorna detalhes
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao criar condomínio'
    );
END;
$$;

-- Função para deletar condomínio como super admin (bypass RLS)
CREATE OR REPLACE FUNCTION delete_condominio_as_super_admin(
  p_condominio_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Delete o condomínio
  DELETE FROM public.condominios WHERE id = p_condominio_id;
  
  -- Verifica se foi deletado
  IF FOUND THEN
    SELECT json_build_object(
      'success', true,
      'message', 'Condomínio excluído com sucesso'
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'success', false,
      'message', 'Condomínio não encontrado'
    ) INTO result;
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao excluir condomínio'
    );
END;
$$;