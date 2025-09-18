-- Criação da tabela de super administradores
CREATE TABLE IF NOT EXISTS public.super_administradores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    cpf text UNIQUE NOT NULL,
    senha text NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS policies para super_administradores
ALTER TABLE public.super_administradores ENABLE ROW LEVEL SECURITY;

-- Policy para permitir que super admins vejam todos os registros
CREATE POLICY "Super admins can view all super_administradores records" ON public.super_administradores
    FOR SELECT USING (true);

-- Policy para permitir que super admins insiram registros
CREATE POLICY "Super admins can insert super_administradores records" ON public.super_administradores
    FOR INSERT WITH CHECK (true);

-- Policy para permitir que super admins atualizem registros
CREATE POLICY "Super admins can update super_administradores records" ON public.super_administradores
    FOR UPDATE USING (true);

-- Policy para permitir que super admins deletem registros
CREATE POLICY "Super admins can delete super_administradores records" ON public.super_administradores
    FOR DELETE USING (true);

-- Inserir o primeiro super administrador
INSERT INTO public.super_administradores (nome, cpf, senha, ativo) VALUES 
('Super Administrador', '12533423858', 'Fbz12061972@', true)
ON CONFLICT (cpf) DO NOTHING;

-- Atualizar a trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela super_administradores
CREATE TRIGGER handle_super_administradores_updated_at
    BEFORE UPDATE ON public.super_administradores
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Comentários para documentação
COMMENT ON TABLE public.super_administradores IS 'Tabela para armazenar super administradores do sistema';
COMMENT ON COLUMN public.super_administradores.cpf IS 'CPF do super administrador (apenas números)';
COMMENT ON COLUMN public.super_administradores.senha IS 'Senha do super administrador';
COMMENT ON COLUMN public.super_administradores.ativo IS 'Status ativo/inativo do super administrador';